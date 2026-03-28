// ============================================================
//  GAME STATE — Zustand store
//  npm install zustand @google/generative-ai
// ============================================================

import { create } from "zustand";
import { GoogleGenerativeAI, ChatSession, SchemaType } from "@google/generative-ai";
import type { CaseFileBackend, CaseFilePlayer } from "./caseFile";
import type { PlayerSeed } from "./obj/backendInterfaces";
import { generateCaseFile, feedCaseFile, buildSuspectSystemPrompt } from "./caseFile";
import { streamSpeech } from "./services/ttsService";
import { selectVoicesForCase } from "./services/voiceSelectorServices.ts";
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ─────────────────────────────────────────────
//  CHAT TYPES
// ─────────────────────────────────────────────

export interface ChatMessage {
  role: "player" | "suspect";
  text: string;           // raw LLM string (includes injected evidence)
  displayText: string;    // what the player typed — shown in chat
  displayClues?: { id: string; name: string }[];
  timestamp: number;
}

export interface SuspectSession {
  suspectName: string;
  chatSession: ChatSession | null;
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
  | "refreshed"      // When the game needs to be pulled from mongodb
  | "briefing"       // Player reading the case report
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
  currentSessionId: string;
  selectedCase: any | null;

  accusationResult: {
    accusedName: string;
    isCorrect: boolean;
    trueKiller: string;
    explanation: string;
  } | null;

  error: string | null;
  isResponding: boolean;
  elapsed: number;
  voiceIds: Record<string, string>;

  // Actions
  setSeed: (seed: Partial<PlayerSeed>) => void;
  startCase: (navigate: (path: string) => void) => Promise<void>;
  proceedToInvestigation: (navigate: (path: string) => void) => void;
  goToBriefing: (navigate: (path: string) => void) => void;
  startInterrogation: (suspectName: string) => void;
 sendMessage: (
  text: string,
  displayText: string,
  displayClues?: { id: string; name: string }[]
) => Promise<void>;
  makeAccusation: (suspectName: string, navigate: (path: string) => void) => void;
  resetGame: () => void;
  markClueDiscovered: (clueId: string) => void;
  tickElapsed: () => void;
  setCurrentSessionId: (sessionId: string) => void; // This function can only be called when the user is signed in
  setSelectedCase: (caseDoc: any) => void;
  setSessions: (sessions: Record<string, SuspectSession>) => void;
}

const DEFAULT_SEED: PlayerSeed = {
  freeText: "",
  difficulty: 5,
  duration: 20,
  intensity: 5,
  userId: "",
  isSignedIn: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  seed: { ...DEFAULT_SEED },


  backend: null,
  player: null,
  activeSuspectName: null,
  sessions: {},
  totalConversationCount: 0,
  currentSessionId: "",
  selectedCase: null,
  accusationResult: null,
  error: null,
  isResponding: false,
  elapsed: 0,
  voiceIds: {},

  // ── Merge partial seed updates ──
  setSeed: (partial) =>
    set(state => ({
      seed: { ...(state.seed ?? DEFAULT_SEED), ...partial },
    })),

  // ── Generate the full case from player seed ──
  startCase: async (navigate: (path: string) => void) => {
    const { seed, phase, currentSessionId, selectedCase } = get() as {
      seed: PlayerSeed;
      phase: GamePhase;
      currentSessionId: string;
      selectedCase: any;
    };

    if (phase === "generating") return;

    const isReloadFlow = Boolean(currentSessionId && selectedCase);

    if (!isReloadFlow && (!seed || !seed.freeText.trim())) {
      set({ error: "Please enter a case theme before starting." });
      alert("Please enter a case theme before starting.");
      return;
    }
    set({ phase: "generating", error: null });

    if (!isReloadFlow) {
      try {
        const { backend, player } = await generateCaseFile(seed);
        // Select voices server-side (non-blocking — falls back to defaults on failure)
        const voiceIds = await selectVoicesForCase(backend.suspects, seed.freeText);
        set({ backend, player, phase: "briefing", elapsed: 0 });
        const { useNotificationStore } = await import("./store/useNotificationStore");
        useNotificationStore.getState().initClues(player.clues)
        navigate("/report");           // ← instead of set({ phase: "briefing" })
      } catch (err) {
        set({ error: "Failed to generate case.", phase: "setup" });
        console.error(err);
      }
    } else {
        // Reloading existing case from selected save.
        try {
          const { backend, player, restoredSessions } = await feedCaseFile(selectedCase);

          const gameState = selectedCase?.game ?? {};
          const restoredPhase = (gameState.phase as GamePhase) ?? "briefing";
          const savedIsResolved =
            selectedCase?.status === "resolved" ||
            restoredPhase === "resolved" ||
            Boolean(selectedCase?.outcome?.accusedName);

          const restoredAccusationResult = selectedCase?.outcome?.accusedName
            ? {
                accusedName: selectedCase.outcome.accusedName,
                isCorrect: Boolean(selectedCase.outcome.isCorrect),
                trueKiller: String(selectedCase.outcome.trueKiller ?? "Unknown"),
                explanation: String(selectedCase.outcome.explanation ?? ""),
              }
            : null;

          set({
            backend,
            player,
            sessions: restoredSessions as unknown as Record<string, SuspectSession>,
            activeSuspectName: gameState.activeSuspectName ?? null,
            totalConversationCount: Number(gameState.totalConversationCount ?? 0),
            elapsed: Number(gameState.elapsedSeconds ?? 0),
            phase: savedIsResolved ? "resolved" : restoredPhase,
            accusationResult: restoredAccusationResult,
          });

          const { useNotificationStore } = await import("./store/useNotificationStore");
          useNotificationStore.getState().initClues(player.clues);

          if (savedIsResolved) {
            navigate("/case-already-resolved-error");
            return;
          }

          navigate("/report");
        } catch (err) {
          set({ error: "Failed to feed case details from MongoDB.", phase: "setup" });
          console.error(err);
        }
        
    }


    
  },

  // ── Player has read the briefing, move to investigation ──
  goToBriefing: (navigate: (path: string) => void) => {
    set({ phase: "briefing" });
    navigate("/report");             // ← instead of set({ phase: "briefing" })
    },
    proceedToInvestigation: (navigate) => {
      set({ phase: "interrogation" });
      navigate("/interrogate");
    },

  startInterrogation: (suspectName) => {
    const { backend, player, sessions } = get();
    if (!backend || !player) return;

    const existingSession = sessions[suspectName];

    // Reuse existing session only if live chatSession is already valid.
    if (existingSession && existingSession.chatSession !== null) {
      set({ phase: "interrogation", activeSuspectName: suspectName });
      return;
    }

    const suspect = backend.suspects.find(s => s.name === suspectName);
    if (!suspect) return;

    const systemPrompt = buildSuspectSystemPrompt(suspect, player.caseReport);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            response:    { type: SchemaType.STRING },
            stressLevel: { type: SchemaType.INTEGER },
          },
          required: ["response", "stressLevel"],
        },
      },
    });

    console.log("[suspect data]", JSON.stringify(suspect, null, 2));


    // Feed restored history so the model has conversation continuity after reload.
    const history = (existingSession?.history ?? [])
      .filter(m => m.text && m.text.trim().length > 0)
      .map(m => ({
        role: m.role === "player" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

    const chatSession = model.startChat({ 
      history
    });

    set(state => ({
      phase: "interrogation",
      activeSuspectName: suspectName,
      sessions: {
        ...state.sessions,
        [suspectName]: {
          // preserve existing history/stress if session was restored from mongo
          ...(existingSession ?? {}),
          suspectName,
          chatSession, // ✅ always a valid ChatSession now
          history: existingSession?.history ?? [],
          conversationCount: existingSession?.conversationCount ?? 0,
          stressLevel: existingSession?.stressLevel ?? 0,
        },
      },
    }));
  },


  // ── Send a player message to the active suspect ──
  sendMessage: async (text, displayText, displayClues) => {
    const { activeSuspectName, sessions } = get();
    const { seed } = get() as { seed: PlayerSeed};
    if (!activeSuspectName || !sessions[activeSuspectName] || get().isResponding) return;

    // Restored saves can have chatSession = null until interrogation is re-opened.
    if (sessions[activeSuspectName].chatSession === null) {
      get().startInterrogation(activeSuspectName);
    }

    const session = get().sessions[activeSuspectName];
    if (!session || session.chatSession === null) {
      set({ error: "Could not initialize interrogation session. Please reopen this suspect and try again." });
      return;
    }

    const playerMessage: ChatMessage = {
      role: "player",
      text,           // full injected LLM string
      displayText,
      displayClues,
      timestamp: Date.now(),
    };

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
      const messageWithContext = `[Current stress level: ${session.stressLevel}]\n\n${text}`;
      const result = await session.chatSession.sendMessage(messageWithContext);
      const raw = result.response.text();
      let responseText = raw;
      console.log("suspect raw response");
      console.log(responseText);
      let newStress = session.stressLevel; // default: keep current if parse fails

      try {
        // Strip markdown code fences
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        // Try to extract a JSON object even if there's trailing garbage
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

        const parsed = JSON.parse(jsonStr);

        // Ensure response is a plain string with no JSON artifacts
        const rawResponse = parsed.response;
        if (typeof rawResponse === "string") {
          responseText = rawResponse;
        } else {
          // parsed.response missing or not a string — strip stress JSON from raw as last resort
          responseText = raw.replace(/["\s]*stressLevel["\s]*:[\s\d]+\}?\s*$/i, "").trim();
        }

        newStress = Math.min(100, Math.max(0, Number(parsed.stressLevel ?? session.stressLevel)));
      } catch {
        console.warn("Could not parse suspect JSON reply — stripping stress artifact from raw text");
        // Fallback: strip any trailing stressLevel JSON fragment from raw
        responseText = raw.replace(/["\s]*stressLevel["\s]*:[\s\d]+\}?\s*$/i, "").trim();
      }

      const suspectMessage: ChatMessage = {
        role: "suspect",
        text: responseText,
        displayText: responseText,  // suspects have no separate display text
        timestamp: Date.now(),
      };

      // Add message to history first
      set(state => ({
        totalConversationCount: state.totalConversationCount + 1,
        sessions: {
          ...state.sessions,
          [activeSuspectName]: {
            ...state.sessions[activeSuspectName],                   
            history: [...state.sessions[activeSuspectName].history, suspectMessage],
            conversationCount: state.sessions[activeSuspectName].conversationCount + 1,
            stressLevel: newStress,
          },
        },
        isResponding: false,
      }));

      console.log("send message function reached, before sign in check")
      // Send data to MongoDB
      if (seed.isSignedIn && seed.userId != "") {
        
        const sessionId =
          get().currentSessionId ||
          get().player?.caseReport?.caseId || // Fallback
          localStorage.getItem("lastSessionId") ||
          localStorage.getItem("lastCaseId") ||
          "";

        console.log("right before sessionId check, after sign in check")
        if (sessionId) {
          const state = get();
          const suspectSessions = Object.values(state.sessions).map((s) => ({
            suspectName: s.suspectName,
            conversationCount: s.conversationCount,
            currentStress: s.stressLevel,
            firstInterrogatedAt: null,
            lastInterrogatedAt: new Date().toISOString(),
            messages: s.history.map((m) => ({
              role: m.role,
              text: m.text,
              timestamp: m.timestamp,
            })),
          }))

          console.log("right before mongo fetch");
          fetch(`http://localhost:3000/cases/${sessionId}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: state.phase === "resolved" ? "resolved" : "in_progress",
              game: {
                phase: state.phase,
                elapsedSeconds: state.elapsed,
                activeSuspectName: state.activeSuspectName,
                totalConversationCount: state.totalConversationCount,
                seed: state.seed,
              },

              interrogation: {
                suspectSessions,
              }
            }),
          }).catch(() => {});
      }
    }

      // Generate and play speech asynchronously (don't block UI)
      const suspectGender = get().player?.characterProfiles.find(
        p => p.name === activeSuspectName
      )?.gender ?? "female";

        
      //tts streamed better\
      const voiceId = get().voiceIds[activeSuspectName];

      if (voiceId) {
        streamSpeech(responseText, voiceId).catch(err =>
          console.error("TTS playback failed:", err)
        );
      }

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
            history: session.history,
          },
        },
      }));
    }
  },

  // ── Player makes their final accusation ──
  makeAccusation: (accusedName, navigate) => {
  const { backend, player } = get();
  const { seed } = get() as { seed: PlayerSeed};
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
  console.log("accusation function called");
  // Save outcome to MongoDB if signed in
  if (seed.isSignedIn && seed.userId != "") {
    const sessionId =
      get().currentSessionId ||
      get().player?.caseReport?.caseId ||
      localStorage.getItem("lastSessionId") ||
      localStorage.getItem("lastCaseId") ||
      "";
    console.log("right before mongo fetch");
    if (sessionId) {
        fetch(`http://localhost:3000/cases/${sessionId}/outcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            caseId: player?.caseReport?.caseId ?? sessionId,
            accusedName,
            isCorrect,
            trueKiller: trueKiller?.name ?? "Unknown",
            explanation: backend.storyline.trueSequenceOfEvents,
          }),
        }).catch(() => {});
  }}
  navigate("/accuse");   // ← navigate AFTER state is set
},

  markClueDiscovered: (clueId) => {
    set(state => {
    if (!state.player) return state
    return {
      player: {
        ...state.player,
        clues: state.player.clues.map(c =>
          c.id === clueId ? { ...c, discovered: true } : c
        )
      }
    };
    });
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
      elapsed: 0,
      voiceIds: {},
    }),
  
    // keeps track of elapsed time
  tickElapsed: () => {
    set(state => ({ elapsed: state.elapsed + 1 }));
  },

  // Sidenote: session ID is equivalent to case ID
  setCurrentSessionId: (sessionId) => {
    set({ currentSessionId: sessionId });
  },

  setSelectedCase: (caseDoc) => set({ selectedCase: caseDoc }), // stores caseDoc from mongo in zustand

  setSessions: (sessions) => set({ sessions }),
}));

// ─────────────────────────────────────────────
//  SELECTOR HOOKS  (use these in components)
// ─────────────────────────────────────────────

// Current active session's chat history
const EMPTY_HISTORY: ChatMessage[] = []

export const useActiveHistory = () => // fix to account for rebuilt case details
  useGameStore(state =>
    state.activeSuspectName
      ? (state.sessions[state.activeSuspectName]?.history ?? EMPTY_HISTORY)
      : EMPTY_HISTORY // FIX: lift the fallback array outside the selector so it's always the same reference, otherwise new obj created within zustand
  )

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

  export const useActiveSuspectVoiceId = () =>
  useGameStore(state =>
    state.activeSuspectName
      ? (state.voiceIds[state.activeSuspectName] ?? null)
      : null
  );