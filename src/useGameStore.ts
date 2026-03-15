// ============================================================
//  GAME STATE — Zustand store
//  npm install zustand @google/generative-ai
// ============================================================

import { create } from "zustand";
import { GoogleGenerativeAI, ChatSession, SchemaType } from "@google/generative-ai";
import type { PlayerSeed, CaseFileBackend, CaseFilePlayer } from "./caseFile";
import { generateCaseFile, buildSuspectSystemPrompt } from "./caseFile";
import { streamSpeech } from "./services/ttsService";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ─────────────────────────────────────────────
//  CHAT TYPES
// ─────────────────────────────────────────────

export interface ChatMessage {
  role: "player" | "suspect";
  text: string;
  timestamp: number;
}

export interface SuspectSession {
  suspectName: string;
  chatSession: ChatSession;
  history: ChatMessage[];
  conversationCount: number;
  stressLevel: number;
}

// ─────────────────────────────────────────────
//  GAME PHASES
// ─────────────────────────────────────────────

export type GamePhase =
  | "setup"          // Player entering seed inputs
  | "generating"     // LLM generating the case file
  | "briefing"       // Player reading the case report
  | "investigation"  // Active interrogation / clue review
  | "interrogation"  // Asking questions to the suspects and finding clues
  | "accusation"     // Player making their final accusation
  | "resolved";      // Case closed, outcome shown

// ─────────────────────────────────────────────
//  STORE
// ─────────────────────────────────────────────

interface GameState {
  phase: GamePhase;
  seed: PlayerSeed | null;

  backend: CaseFileBackend | null;  // 🔒 Never pass directly to UI components
  player: CaseFilePlayer | null;    // ✅ Safe to render anywhere

  activeSuspectName: string | null;
  sessions: Record<string, SuspectSession>;
  totalConversationCount: number;

  accusationResult: {
    accusedName: string;
    isCorrect: boolean;
    trueKiller: string;
    explanation: string;
  } | null;

  error: string | null;
  isResponding: boolean;

  // Actions
  setSeed: (seed: Partial<PlayerSeed>) => void;
  startCase: (navigate: (path: string) => void) => Promise<void>;
  proceedToInvestigation: (navigate: (path: string) => void) => void;
  interrogateSuspects: (navigate: (path: string) => void) => void;
  goToBriefing: (navigate: (path: string) => void) => void;
  startInterrogation: (suspectName: string) => void;
  sendMessage: (text: string) => Promise<void>;
  makeAccusation: (suspectName: string, navigate: (path: string) => void) => void;  resetGame: () => void,
}

const DEFAULT_SEED: PlayerSeed = {
  freeText: "",
  difficulty: 5,
  duration: 20,
  intensity: 5,
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  seed: { ...DEFAULT_SEED },
  backend: null,
  player: null,
  activeSuspectName: null,
  sessions: {},
  totalConversationCount: 0,
  accusationResult: null,
  error: null,
  isResponding: false,

  // ── Merge partial seed updates ──
  setSeed: (partial) =>
    set(state => ({
      seed: { ...(state.seed ?? DEFAULT_SEED), ...partial },
    })),

  // ── Generate the full case from player seed ──
  startCase: async (navigate: (path: string) => void) => {
    const { seed } = get();
    if (!seed || !seed.freeText.trim()) {
      set({ error: "Please enter a case theme before starting." });
      alert("Please enter a case theme before starting.");
      return;
    }
    set({ phase: "generating", error: null });
    try {
      const { backend, player } = await generateCaseFile(seed);
      set({ backend, player, phase: "briefing" });
      navigate("/report");           // ← instead of set({ phase: "briefing" })
    } catch (err) {
      set({ error: "Failed to generate case.", phase: "setup" });
      console.error(err);
    }
  },

  // ── Player has read the briefing, move to investigation ──
 goToBriefing: (navigate: (path: string) => void) => {
  set({ phase: "briefing" });
  navigate("/report");             // ← instead of set({ phase: "briefing" })
  },
  proceedToInvestigation: (navigate) => {
    set({ phase: "investigation" });
    navigate("/interrogate");
  },
  // ── Open or resume a chat session with a suspect ──
  interrogateSuspects: (navigate) => {
    set({ phase: "interrogation" });
    navigate("/interrogate");
  },

  startInterrogation: (suspectName) => {
    const { backend, player, sessions } = get();
    if (!backend || !player) return;

    // Reuse existing session if already started
    if (sessions[suspectName]) {
      set({ activeSuspectName: suspectName });
      return;
    }

    const suspect = backend.suspects.find(s => s.name === suspectName);
    if (!suspect) return;

    const systemPrompt = buildSuspectSystemPrompt(suspect, player.caseReport);

    console.log("system prompt");
    console.log(systemPrompt);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt,
      generationConfig: { 
        temperature: 0.85, 
        responseMimeType: "application/json", 
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            response:    { type: SchemaType.STRING },
            stressLevel: { 
              type: SchemaType.INTEGER, 
              description: "A number between 0 and 100. Must reflect cumulative interrogation pressure. Spikes 15-25 on direct hits about the crime, drops 5-10 on successful deflections. Never resets to 0."
            },},
        },
      },
    });

    const chatSession = model.startChat({ history: [] });

    set(state => ({
      activeSuspectName: suspectName,
      sessions: {
        ...state.sessions,
        [suspectName]: {
          suspectName,
          chatSession,
           history: [],
          conversationCount: 0,
          stressLevel: 0,
        },
      },
    }));
  },

  // ── Send a player message to the active suspect ──
  sendMessage: async (text) => {
    const { activeSuspectName, sessions } = get();
    if (!activeSuspectName || !sessions[activeSuspectName] || get().isResponding) return;

    const session = sessions[activeSuspectName];
    const playerMessage: ChatMessage = { role: "player", text, timestamp: Date.now() };

    // Optimistically add player message and lock input
    set(state => ({
      isResponding: true,
      sessions: {
        ...state.sessions,
        [activeSuspectName]: {
          ...session,
          history: [...session.history, playerMessage],
        },
      },
    }));

    try {
      const result = await session.chatSession.sendMessage(text);
      const raw = result.response.text();
      let responseText = raw;
      console.log("suspect raw response");
      console.log(responseText);
      let newStress = session.stressLevel; // default: keep current if parse fails

      try {
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        responseText = String(parsed.response ?? raw);
        newStress = Math.min(100, Math.max(0, Number(parsed.stressLevel ?? session.stressLevel)));
      } catch {
        console.warn("Could not parse suspect JSON reply — using raw text");
      }

      const suspectMessage: ChatMessage = {
        role: "suspect",
        text: responseText,
        timestamp: Date.now(),
      };

      // Add message to history first
      set(state => ({
        totalConversationCount: state.totalConversationCount + 1,
        sessions: {
          ...state.sessions,
          [activeSuspectName]: {
            ...session,
            history: [...session.history, playerMessage, suspectMessage],
            conversationCount: session.conversationCount + 1,
            stressLevel: newStress,   // ← ADD
          },
        },
      }));

      // Generate and play speech asynchronously (don't block UI)
      const suspectGender = get().player?.characterProfiles.find(
        p => p.name === activeSuspectName
      )?.gender ?? "female";

      //TTS BELOW!!!!!!
/*
      streamSpeech(responseText, suspectGender).catch(err => {
        console.error("TTS playback failed:", err);
      });
*/


      // Mark as no longer responding after message is added
      set({ isResponding: false });
    } catch (err) {
      console.error("Message failed:", err);
      // Revert optimistic message on failure
      set(state => ({
        isResponding: false,
        error: "Failed to get a response. Try again.",
        sessions: {
          ...state.sessions,
          [activeSuspectName]: {
            ...session,
            history: session.history.slice(0, -1), // Remove the optimistically added player message
          },
        },
      }));
    }
  },

  // ── Player makes their final accusation ──
  makeAccusation: (accusedName, navigate) => {
  const { backend } = get();
  if (!backend) return;

  const trueKiller = backend.suspects.find(s => s.isGuilty);
  const isCorrect  = accusedName === trueKiller?.name;

  set({
    phase: "resolved",
    accusationResult: {
      accusedName,
      isCorrect,
      trueKiller:  trueKiller?.name ?? "Unknown",
      explanation: backend.storyline.trueSequenceOfEvents,
    },
  });

  navigate("/accuse");   // ← navigate AFTER state is set
},
  // ── Reset everything for a new game ──
  
  resetGame: () =>
    set({
      phase: "setup",
      seed: { ...DEFAULT_SEED },
      backend: null,
      player: null,
      activeSuspectName: null,
      sessions: {},
      totalConversationCount: 0,
      accusationResult: null,
      error: null,
      isResponding: false,
    }),
}));

// ─────────────────────────────────────────────
//  SELECTOR HOOKS  (use these in components)
// ─────────────────────────────────────────────

// Current active session's chat history
export const useActiveHistory = () =>
  useGameStore(state =>
    state.activeSuspectName
      ? (state.sessions[state.activeSuspectName]?.history ?? [])
      : []
  );

// Safe player data — the only thing UI components should read from
export const usePlayerData = () => useGameStore(state => state.player);

// Active suspect's profile (player-facing only)
export const useActiveSuspectProfile = () =>
  useGameStore(state => {
    if (!state.activeSuspectName || !state.player) return null;
    return state.player.characterProfiles.find(
      p => p.name === state.activeSuspectName
    ) ?? null;
  });

  export const useActiveSuspectStress = () =>
  useGameStore(state =>
    state.activeSuspectName
      ? (state.sessions[state.activeSuspectName]?.stressLevel ?? 0)
      : 0
  );