// ============================================================
//  GAME STATE — Zustand store
// ============================================================

import { create } from "zustand";
import type { CaseFileBackend, CaseFilePlayer } from "./caseFile";
import type { PlayerSeed } from "./obj/backendInterfaces";
import { generateCaseFile, feedCaseFile, buildSuspectSystemPrompt } from "./caseFile";
import { streamSpeech } from "./services/ttsService";
import { selectVoicesForCase } from "./services/voiceSelectorServices";
import { callModel } from "./services/ai";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────
//  CHAT TYPES
// ─────────────────────────────────────────────

export interface ChatMessage {
  role: "player" | "suspect";
  text: string;
  displayText: string;
  displayClues?: { id: string; name: string }[];
  timestamp: number;
}

export type SuspicionLevel = "low" | "medium" | "high";

export interface SuspectSession {
  suspectName: string;
  history: ChatMessage[];
  conversationCount: number;
  stressLevel: number;
  suspicionLevel: SuspicionLevel | null;
}

// ─────────────────────────────────────────────
//  GAME PHASES
// ─────────────────────────────────────────────

export type GamePhase =
  | "setup"
  | "generating"
  | "refreshed"
  | "briefing"
  | "interrogation"
  | "accusation"
  | "resolved";

// ─────────────────────────────────────────────
//  STORE
// ─────────────────────────────────────────────

interface GameState {
  phase: GamePhase;
  seed: PlayerSeed | null;

  backend: CaseFileBackend | null;
  player: CaseFilePlayer | null;

  activeSuspectName: string | null;
  sessions: Record<string, SuspectSession>;
  totalConversationCount: number;
  currentSessionId: string;
  selectedCase: any | null;
  isFirstClueDiscovery: boolean;
  numDiscoveredClues: number;
  accusationUnlocked: boolean;

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
  isSpeaking: boolean;

  // Actions
  setSeed: (seed: Partial<PlayerSeed>) => void;
  startCase: (navigate: (path: string) => void) => Promise<boolean>;
  proceedToInvestigation: (navigate: (path: string) => void) => void;
  goToBriefing: (navigate: (path: string) => void) => void;
  startInterrogation: (suspectName: string) => void;
  setSuspicionLevelForSuspect: (suspectName: string, level: SuspicionLevel | null) => void;
  sendMessage: (
    text: string,
    displayText: string,
    displayClues?: { id: string; name: string }[]
  ) => Promise<void>;
  makeAccusation: (suspectName: string, navigate: (path: string) => void) => void;
  resetGame: () => void;
  markClueDiscovered: (clueId: string) => void;
  clearFirstClueDiscovery: () => void;
  clearLoadedCase: () => void;
  tickElapsed: () => void;
  setCurrentSessionId: (sessionId: string) => void;
  setSelectedCase: (caseDoc: any) => void;
  setSessions: (sessions: Record<string, SuspectSession>) => void;
  loadSharedCaseTemplate: (template: any, caseCode: string, navigate: (path: string) => void) => Promise<void>;
}

const DEFAULT_SEED: PlayerSeed = {
  freeText: "",
  difficulty: 5,
  duration: 15,
  intensity: 5,
  userId: "",
  isSignedIn: false,
};

const ACCUSATION_MIN_CLUES = 2;

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
  isFirstClueDiscovery: false,
  numDiscoveredClues: 0,
  accusationUnlocked: false,
  accusationResult: null,
  error: null,
  isResponding: false,
  elapsed: 0,
  voiceIds: {},
  isSpeaking: false,

  setSeed: (partial) =>
    set(state => ({
      seed: { ...(state.seed ?? DEFAULT_SEED), ...partial },
    })),

  startCase: async (navigate: (path: string) => void): Promise<boolean> => {
    const { seed, phase, currentSessionId, selectedCase } = get() as {
      seed: PlayerSeed;
      phase: GamePhase;
      currentSessionId: string;
      selectedCase: any;
    };

    if (phase === "generating") return false;

    const isReloadFlow = Boolean(currentSessionId && selectedCase);

    if (!isReloadFlow && (!seed || !seed.freeText.trim())) {
      set({ error: "Please enter a case theme before starting." });
      alert("Please enter a case theme before starting.");
      return false;
    }
    set({ phase: "generating", error: null });
    navigate("/loading");

    if (!isReloadFlow) {
      try {
        const { backend, player } = await generateCaseFile(seed);

        let voiceIds: Record<string, string> = {};
        try {
          voiceIds = await selectVoicesForCase(backend.suspects, seed.freeText);
        } catch (err) {
          console.warn("[VoiceSelector] Failed, continuing without voices:", err);
        }
        set({
          backend,
          player,
          phase: "briefing",
          elapsed: 0,
          numDiscoveredClues: 0,
          isFirstClueDiscovery: false,
          voiceIds,
        });
        const { useNotificationStore } = await import("./store/useNotificationStore");
        useNotificationStore.getState().initClues(player.clues);
        navigate("/report");
        return false;
      } catch (err) {
        set({ error: "Failed to generate case.", phase: "setup" });
        console.error(err);
        return false;
      }
    } else {
      try {
        const { backend, player, restoredSessions, isResolved } = await feedCaseFile(selectedCase);
        const discoveredCluesCount = player.clues.filter(c => c.discovered).length;

        const gameState = selectedCase?.game ?? {};
        const restoredPhase = (gameState.phase as GamePhase) ?? "briefing";

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
          phase: isResolved ? "resolved" : restoredPhase,
          numDiscoveredClues: discoveredCluesCount,
          isFirstClueDiscovery: discoveredCluesCount === 1,
          accusationUnlocked: discoveredCluesCount >= ACCUSATION_MIN_CLUES,
          accusationResult: restoredAccusationResult,
        });

        const { useNotificationStore } = await import("./store/useNotificationStore");
        useNotificationStore.getState().initClues(player.clues);
        useNotificationStore.getState().hydrateSchedulerState(selectedCase?.schedulerState ?? null);

        if (isResolved) {
          console.log(selectedCase?.status);
          navigate("/case-already-resolved-error");
          return true;
        }

        navigate("/report");
        return true;
      } catch (err) {
        set({ error: "Failed to feed case details from MongoDB.", phase: "setup" });
        console.error(err);
        return false;
      }
    }

    return false;
  },

  goToBriefing: (navigate: (path: string) => void) => {
    set({ phase: "briefing" });
    navigate("/report");
  },
  proceedToInvestigation: (navigate) => {
    set({ phase: "interrogation" });
    navigate("/interrogate");
  },

  startInterrogation: (suspectName) => {
    const { backend, player, sessions } = get();
    if (!backend || !player) return;

    if (sessions[suspectName]) {
      set({ phase: "interrogation", activeSuspectName: suspectName });
      return;
    }

    set(state => ({
      phase: "interrogation",
      activeSuspectName: suspectName,
      sessions: {
        ...state.sessions,
        [suspectName]: {
          suspectName,
          history: [],
          conversationCount: 0,
          stressLevel: 0,
          suspicionLevel: null,
        },
      },
    }));
  },

  setSuspicionLevelForSuspect: (suspectName, level) => {
    set((state) => {
      const currentSession = state.sessions[suspectName];
      if (!currentSession) return state;
      return {
        sessions: {
          ...state.sessions,
          [suspectName]: { ...currentSession, suspicionLevel: level },
        },
      };
    });
  },

  sendMessage: async (text, displayText, displayClues) => {
    const { activeSuspectName, backend, player } = get();
    const { seed } = get() as { seed: PlayerSeed };

    if (!activeSuspectName || !backend || !player || get().isResponding) return;

    if (!get().sessions[activeSuspectName]) {
      get().startInterrogation(activeSuspectName);
    }

    const session = get().sessions[activeSuspectName];
    if (!session) {
      set({ error: "Could not initialize interrogation session. Please reopen this suspect and try again." });
      return;
    }

    const playerMessage: ChatMessage = {
      role: "player",
      text,
      displayText,
      displayClues,
      timestamp: Date.now(),
    };

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
      const isSpam = (() => {
        const stripped = text.replace(/\[EVIDENCE PRESENTED[\s\S]*?\n\n/g, "").trim();
        if (!stripped) return false;
        const hasWord = /[a-zA-Z]{2,}/.test(stripped);
        const isRepetitive = /(.)\1{4,}/.test(stripped);
        const noLetters = !/[a-zA-Z]/.test(stripped);
        return (!hasWord && isRepetitive) || noLetters || (!hasWord && stripped.length > 3);
      })();

      const isOffTopic = (() => {
        if (isSpam) return false;
        const lower = text.toLowerCase();
        const offTopicPatterns = [
          /\bfavorite\s+(color|colour|food|movie|film|song|band|book|animal|sport|game|math|number|function|formula)\b/,
          /\bwrite\s+(me\s+)?(a\s+)?(poem|song|story|haiku|essay|joke|riddle)\b/,
          /\btell\s+(me\s+)?a\s+joke\b/,
          /\bwhat\s+is\s+\d+\s*[\+\-\*\/]\s*\d+\b/,
          /\bwho\s+would\s+win\b/,
          /\bmeaning\s+of\s+life\b/,
          /\brecipe\s+for\b/,
          /\bcan\s+you\s+(sing|dance|rap|code|program|translate)\b/,
          /\bwhat('s|\s+is)\s+(the\s+)?capital\s+of\b/,
          /\brecommend\s+(a\s+)?(movie|book|show|restaurant|place)\b/,
        ];
        return offTopicPatterns.some(p => p.test(lower));
      })();

      const spamPrefix = isSpam
        ? "[DETECTIVE INPUT CLASSIFICATION: NONSENSE/SPAM — do NOT raise stress; respond with brief confused dismissal]\n\n"
        : isOffTopic
        ? "[DETECTIVE INPUT CLASSIFICATION: OFF-TOPIC — completely unrelated to the case or interrogation. Do NOT answer the question. Do NOT raise stress. Respond in-character with confused irritation and redirect to the interrogation.]\n\n"
        : "";

      const hasEvidencePresentation = Boolean(displayClues?.length);
      const hasDirectEvidence = /directly implicates you/i.test(text);

      const recentForPrefix = session.history
        .filter(m => m.role === "player")
        .slice(-3)
        .map(m => m.displayText?.trim().toLowerCase() ?? "");
      const currentForPrefix = (displayText ?? text).trim().toLowerCase();
      const isRepeatedForPrefix =
        recentForPrefix.length >= 2 &&
        recentForPrefix.every(m =>
          m === currentForPrefix ||
          m.slice(0, 12) === currentForPrefix.slice(0, 12) ||
          (m.length > 4 && currentForPrefix.includes(m)) ||
          (currentForPrefix.length > 4 && m.includes(currentForPrefix))
        );
      const repetitionPrefix = isRepeatedForPrefix
        ? "[DETECTIVE INPUT CLASSIFICATION: REPEATED QUESTION — detective has asked this same question multiple times with no new evidence. Stress does NOT rise. Respond with increasing impatience or dismissiveness.]\n\n"
        : "";

      const messageWithContext = `${spamPrefix}${repetitionPrefix}[Current stress level: ${session.stressLevel}]\n\n${text}`;
      const messages: { role: "user" | "assistant"; content: string }[] = [
        ...session.history
          .filter(m => m.text?.trim())
          .map(m => ({
            role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
            content: m.text,
          })),
        { role: "user", content: messageWithContext },
      ];

      const suspect = backend.suspects.find(s => s.name === activeSuspectName)!;
      const systemPrompt = buildSuspectSystemPrompt(suspect, player.caseReport, player.clues);

      // ── Suspect chat uses Groq (fast, low-latency)
      const raw = await callModel({
        model: "llama-3.3-70b-versatile",
        provider: "groq",
        system: systemPrompt,
        messages,
        temperature: 0.9,
      });

      console.log("suspect raw response", raw);
      let responseText = raw;
      let newStress = session.stressLevel;

      try {
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
        const parsed = JSON.parse(jsonStr);

        const rawResponse = parsed.response;
        if (typeof rawResponse === "string") {
          responseText = rawResponse;
        } else {
          responseText = raw.replace(/["\s]*stressLevel["\s]*:[\s\d]+\}?\s*$/i, "").trim();
        }

        newStress = Math.min(100, Math.max(0, Number(parsed.stressLevel ?? session.stressLevel)));

        const MAX_STRESS_DELTA = 20;
        if (newStress > session.stressLevel + MAX_STRESS_DELTA) {
          newStress = session.stressLevel + MAX_STRESS_DELTA;
        }

        const recentPlayerMessages = session.history
          .filter(m => m.role === "player")
          .slice(-3)
          .map(m => m.displayText?.trim().toLowerCase() ?? "");
        const currentMsg = (displayText ?? text).trim().toLowerCase();
        const isRepeatedQuestion =
          recentPlayerMessages.length >= 2 &&
          recentPlayerMessages.every(m => (
            m.slice(0, 12) === currentMsg.slice(0, 12) ||
            m === currentMsg ||
            (m.length > 4 && currentMsg.includes(m)) ||
            (currentMsg.length > 4 && m.includes(currentMsg))
          ));
        if (isRepeatedQuestion && newStress > session.stressLevel) {
          newStress = session.stressLevel;
        }

        if (!isSpam && !isOffTopic && hasEvidencePresentation && newStress <= session.stressLevel + 2) {
          const evidenceFloor = hasDirectEvidence ? 10 : 6;
          newStress = Math.min(100, session.stressLevel + evidenceFloor);
        }
      } catch {
        console.warn("Could not parse suspect JSON reply — stripping stress artifact from raw text");
        responseText = raw.replace(/["\s]*stressLevel["\s]*:[\s\d]+\}?\s*$/i, "").trim();
      }

      const suspectMessage: ChatMessage = {
        role: "suspect",
        text: responseText,
        displayText: "",
        timestamp: Date.now(),
      };

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

      // Persist to MongoDB
      if (seed.isSignedIn && seed.userId !== "") {
        const sessionId =
          get().currentSessionId ||
          get().player?.caseReport?.caseId ||
          localStorage.getItem("lastSessionId") ||
          localStorage.getItem("lastCaseId") ||
          "";

        if (sessionId) {
          const state = get();
          const { useNotificationStore } = await import("./store/useNotificationStore");
          const notificationState = useNotificationStore.getState();
          const suspectSessions = Object.values(state.sessions).map((s) => ({
            suspectName: s.suspectName,
            conversationCount: s.conversationCount,
            currentStress: s.stressLevel,
            suspicionLevel: s.suspicionLevel ?? null,
            firstInterrogatedAt: null,
            lastInterrogatedAt: new Date().toISOString(),
            messages: s.history.map((m) => ({
              role: m.role,
              text: m.text,
              timestamp: m.timestamp,
            })),
          }));

          fetch(`${API_BASE}/cases/${sessionId}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: seed.userId,
              status: state.phase === "resolved" ? "resolved" : "in_progress",
              game: {
                phase: state.phase,
                elapsedSeconds: state.elapsed,
                activeSuspectName: state.activeSuspectName,
                totalConversationCount: state.totalConversationCount,
                seed: state.seed,
              },
              interrogation: { suspectSessions },
              schedulerState: {
                lastFiredAt: notificationState.lastFiredAt,
                nextFireAt: notificationState.nextFireAt,
                timerPaused: notificationState.timerPaused,
              },
            }),
          }).catch(() => {});
        }
      }

      // TTS
      const voiceId = get().voiceIds[activeSuspectName];
      if (responseText) {
        streamSpeech(
          responseText,
          voiceId ?? null,
          (speaking) => set({ isSpeaking: speaking }),
          (revealedText) => {
            set(state => {
              const session = state.sessions[activeSuspectName];
              if (!session) return state;
              const history = [...session.history];
              const lastIdx = history.length - 1;
              if (history[lastIdx]?.role === "suspect") {
                history[lastIdx] = { ...history[lastIdx], displayText: revealedText };
              }
              return {
                sessions: {
                  ...state.sessions,
                  [activeSuspectName]: { ...session, history },
                },
              };
            });
          }
        ).catch(err => console.error("[tts] playback failed:", err));
      }

      set({ isResponding: false });
    } catch (err) {
      console.error("Message failed:", err);
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

  makeAccusation: (accusedName, navigate) => {
    const { backend, player, numDiscoveredClues } = get();
    const { seed } = get() as { seed: PlayerSeed };
    if (!backend) return;
    if (numDiscoveredClues >= ACCUSATION_MIN_CLUES) {
      set({ accusationUnlocked: true });
    }

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

    if (seed.isSignedIn && seed.userId !== "") {
      const sessionId =
        get().currentSessionId ||
        get().player?.caseReport?.caseId ||
        localStorage.getItem("lastSessionId") ||
        localStorage.getItem("lastCaseId") ||
        "";

      if (sessionId) {
        fetch(`${API_BASE}/cases/${sessionId}/outcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: seed.userId,
            sessionId,
            caseId: player?.caseReport?.caseId ?? sessionId,
            accusedName,
            isCorrect,
            trueKiller: trueKiller?.name ?? "Unknown",
            explanation: backend.storyline.trueSequenceOfEvents,
          }),
        }).catch(() => {});
      }
    }

    navigate("/accuse");
  },

  markClueDiscovered: (clueId) => {
    set(state => {
      if (!state.player) return state;

      const targetClue = state.player.clues.find(c => c.id === clueId);
      if (!targetClue || targetClue.discovered) return state;

      const nextNumDiscovered = state.numDiscoveredClues + 1;
      return {
        numDiscoveredClues: nextNumDiscovered,
        isFirstClueDiscovery: nextNumDiscovered === 1,
        accusationUnlocked: nextNumDiscovered >= ACCUSATION_MIN_CLUES,
        player: {
          ...state.player,
          clues: state.player.clues.map(c =>
            c.id === clueId ? { ...c, discovered: true } : c
          ),
        },
      };
    });
  },

  clearFirstClueDiscovery: () => {
    set({ isFirstClueDiscovery: false });
  },

  clearLoadedCase: () => {
    set({ currentSessionId: "", selectedCase: null });
  },

  resetGame: () =>
    set({
      phase: "setup",
      seed: { ...DEFAULT_SEED },
      backend: null,
      player: null,
      activeSuspectName: null,
      sessions: {},
      totalConversationCount: 0,
      isFirstClueDiscovery: false,
      numDiscoveredClues: 0,
      currentSessionId: "",
      selectedCase: null,
      accusationResult: null,
      error: null,
      isResponding: false,
      elapsed: 0,
      voiceIds: {},
      accusationUnlocked: false,
    }),

  tickElapsed: () => {
    set(state => ({ elapsed: state.elapsed + 1 }));
  },

  setCurrentSessionId: (sessionId) => {
    set({ currentSessionId: sessionId });
  },

  setSelectedCase: (caseDoc) => set({ selectedCase: caseDoc }),

  setSessions: (sessions) => set({ sessions }),

  loadSharedCaseTemplate: async (template, caseCode, navigate) => {
    try {
      const currentSeed = get().seed ?? DEFAULT_SEED;
      const templateSeed = template?.seed ?? {};
      const mergedSeed: PlayerSeed = {
        ...DEFAULT_SEED,
        ...templateSeed,
        userId: currentSeed.userId ?? "",
        isSignedIn: currentSeed.isSignedIn ?? false,
      };

      const initialClues = (template?.caseData?.initialClues ?? []).map((clue: any) => ({
        ...clue,
        discovered: Boolean(clue?.discovered ?? false),
        clueLost: Boolean(clue?.clueLost ?? false),
      }));

      const backend: CaseFileBackend = {
        storyline: template.caseData.storyline,
        suspects: template.caseData.suspects,
        clues: initialClues,
      };

      const player: CaseFilePlayer = {
        characterProfiles: template.caseData.characterProfiles,
        caseReport: template.caseData.caseReport,
        clues: initialClues,
      };

      let voiceIds: Record<string, string> = {};
      try {
        voiceIds = await selectVoicesForCase(backend.suspects, mergedSeed.freeText);
      } catch (err) {
        console.warn("[VoiceSelector] Failed, continuing without voices:", err);
      }

      const sharedSessionId = String(caseCode ?? template?.caseData?.caseReport?.caseId ?? "").trim();
      if (!sharedSessionId) {
        throw new Error("Missing case code for shared session");
      }

      set({
        phase: "briefing",
        seed: mergedSeed,
        backend,
        player,
        activeSuspectName: null,
        sessions: {},
        totalConversationCount: 0,
        elapsed: 0,
        selectedCase: null,
        accusationResult: null,
        error: null,
        isResponding: false,
        voiceIds,
        currentSessionId: sharedSessionId,
        accusationUnlocked: false,
      });

      const { useNotificationStore } = await import("./store/useNotificationStore");
      useNotificationStore.getState().initClues(player.clues);

      if (mergedSeed.isSignedIn && mergedSeed.userId) {
        fetch(`${API_BASE}/cases/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sharedSessionId,
            userId: mergedSeed.userId,
            seed: mergedSeed,
            game: {
              phase: "briefing",
              elapsedSeconds: 0,
              activeSuspectName: null,
              totalConversationCount: 0,
            },
            caseData: {
              storyline: template.caseData.storyline,
              suspects: template.caseData.suspects,
              caseReport: template.caseData.caseReport,
              characterProfiles: template.caseData.characterProfiles,
              initialClues,
            },
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json();
              console.error("[loadSharedCaseTemplate] POST failed:", res.status, errorData);
              return;
            }
            const result = await res.json();
            console.log("[loadSharedCaseTemplate] Game created successfully:", result);
          })
          .catch((err) => {
            console.error("[loadSharedCaseTemplate] Network error:", err);
          });
      } else {
        console.warn("[loadSharedCaseTemplate] Skipping /cases/create because auth is missing in seed:", {
          isSignedIn: mergedSeed.isSignedIn,
          userId: mergedSeed.userId,
        });
      }

      navigate("/report");
    } catch (err) {
      console.error("Could not load shared case template:", err);
      set({ error: "Could not load shared case template." });
    }
  },
}));

// ─────────────────────────────────────────────
//  SELECTOR HOOKS
// ─────────────────────────────────────────────

const EMPTY_HISTORY: ChatMessage[] = [];

export const useActiveHistory = () =>
  useGameStore(state =>
    state.activeSuspectName
      ? (state.sessions[state.activeSuspectName]?.history ?? EMPTY_HISTORY)
      : EMPTY_HISTORY
  );

export const usePlayerData = () => useGameStore(state => state.player);

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