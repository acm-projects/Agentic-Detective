import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  NotificationPayload,
  Clue,
  WordleData,
  ImageUnshuffleData,
  CaesarCipherData,
  NotificationType,
  MinigameData,
  MinigameType,
} from "../obj/notificationInterfaces";

// Schedule Config
/*
const SCHEDULE_CONFIG = {
    firstNotificationWindow: [1_000, 2_000] as [number, number], // 120, 180
    cooldown: 10_000, // 90
    toastLifetime: 40_000, // Toast: a gui element that shows up, then disappears; 30
    minGameTimeRemaining: 60_000, // 60
};
*/

const MESSAGE_SCHEDULE_CONFIG = {
  firstNotificationWindowMessageCount: [2, 5] as [number, number], // originally 5, 10
  cooldownMessageCount: [2, 5] as [number, number], // originally 5, 10
  toastLifetime: 40_000,
  minGameTimeRemaining: 60_000,
};

interface PersistedSchedulerState {
  lastFiredAt?: number | null;
  nextFireAt?: number | null;
  timerPaused?: boolean;
}

// Helper Functions and Constants
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function pickRandom<T>(arr: T[]) {
  return arr[randBetween(0, arr.length - 1)];
}

const NOTIFICATION_TYPES: NotificationType[] = ["mail"];
const MINIGAME_TYPES: MinigameType[] = ["wordle", "image-unshuffle", "cipher"];

const HEADLINES: Record<NotificationType, string[]> = {
  mail: [
    "A sealed envelope was found beneath the victim's pillow.",
    "The postmaster delivered a letter addressed to the deceased.",
    "A crumpled note surfaced in the wastepaper basket.",
  ],
};

const FLAVOR_TEXTS: Record<NotificationType, string[]> = {
  mail: [
    "The envelope is sealed with wax — whoever wrote this wanted it kept private.",
    "To read it, you'll need to work through the lock.",
    "The letter appears to be written in code. Whoever sent this didn't want it read by the wrong eyes.",
  ],
};

// ─────────────────────────────────────────────
//  Wordle Data Generator
// ─────────────────────────────────────────────

const WORDLE_DETECTIVE_WORDS = [
  { answer: "KNIFE", hint: "The murder weapon may be closer than you think." },
  { answer: "ALIBI", hint: "Someone's story doesn't quite add up." },
  { answer: "BLOOD", hint: "The forensics report holds a grim detail." },
  { answer: "VAULT", hint: "Something was locked away the night of the murder." },
  { answer: "CLOAK", hint: "A witness described what the figure was wearing." },
  { answer: "FORGE", hint: "A document in the study may not be authentic." },
  { answer: "DECOY", hint: "Not everything found at the scene was accidental." },
  { answer: "GUEST", hint: "An unexpected visitor arrived that evening." },
  { answer: "LYING", hint: "One suspect's testimony contradicts another." },
  { answer: "MOTIVE", hint: "Follow the money." },
  { answer: "TRACE", hint: "A tiny piece of evidence was left behind." },
  { answer: "STAIN", hint: "Something spilled during the struggle." },
  { answer: "PRINT", hint: "A mark on the glass could identify the culprit." },
  { answer: "SCENE", hint: "Reconstruct what happened where the body was found." },
  { answer: "CHASE", hint: "Someone was seen running shortly after the crime." },
  { answer: "RIVAL", hint: "The victim had a bitter competitor." },
  { answer: "MONEY", hint: "A suspicious transfer happened before the murder." },
  { answer: "RUMOR", hint: "Whispers around town hint at a dark secret." },
  { answer: "STEAL", hint: "Was the killing tied to a theft?" },
  { answer: "ENTRY", hint: "How did the killer get inside?" },
  { answer: "NOTES", hint: "The victim wrote something important before dying." },
  { answer: "CLOCK", hint: "The stopped time may reveal when it happened." },
  { answer: "DOORS", hint: "One of them was left unlocked that night." },
  { answer: "PANEL", hint: "A hidden compartment may conceal evidence." },
  { answer: "DRINK", hint: "What the victim consumed might hold a clue." },
];

function generateWordleData(): WordleData {
  const entry = pickRandom(WORDLE_DETECTIVE_WORDS);
  return {
    kind: "wordle",
    answer: entry.answer.toUpperCase(),
    maxNumGuesses: 6,
    hint: entry.hint,
  };
}

// ─────────────────────────────────────────────
//  Cipher Data Generator - TEMPORARY <<<<< REMOVE LATER IF NEEDED, ADDED THIS HERE CUZ I COULDNT FIND THE GENERATECIPHERDATA FUNCTION
// ─────────────────────────────────────────────

const CIPHER_PLAINS = [
  "THE BUTLER LIED",
  "CHECK THE LEDGER",
  "THE KEY IS MISSING",
  "MEET AT MIDNIGHT",
  "FOLLOW THE MONEY",
  "THE WINDOW WAS OPEN",
  "ALIBI DOES NOT HOLD",
  "LOOK INSIDE THE VAULT",
  "THE LETTER IS FAKE",
  "THE GARDENER SAW BLOOD",
];

function generateCipherData(): CaesarCipherData {
  const plain = pickRandom(CIPHER_PLAINS).toUpperCase();
  const shift = randBetween(1, 25);

  return {
    kind: "cipher",
    plain,
    shift,
    clues: [
      `This is a Caesar cipher with a shift of ${shift}.`,
      `The decoded message has ${plain.length} characters.`,
      "Spaces and punctuation are not shifted.",
    ],
  };
}

// ─────────────────────────────────────────────
//  Image Unshuffle Data Generator
// ─────────────────────────────────────────────

const IMAGE_UNSHUFFLE_CLUES = [
    { hint: 'The photograph reveals a face you weren\'t meant to recognise.' },
    { hint: 'A torn image from the victim\'s coat pocket — piece it together.' },
    { hint: 'Security footage, corrupted and scrambled. Restore it.' },
    { hint: 'A portrait found behind the bookcase. Something is off about it.' },
    { hint: 'The picture was cut apart to hide what it showed.' },
    { hint: 'A map fragment. The location marked may be the key.' },
    { hint: 'A photo slipped under the door the morning of the murder.' },
    { hint: 'The image was deliberately scrambled. Someone didn\'t want it seen.' },
];

const IMAGE_UNSHUFFLE_IMAGES = [
  '../../assets/Key.png',
  '../../assets/Outline.png',
  '../../assets/MagnifyingGlass.png'
  // add more as needed
];

function generateImageUnshuffleData(): ImageUnshuffleData {
    const entry = pickRandom(IMAGE_UNSHUFFLE_CLUES);
    return {
        kind: 'image-unshuffle',
        imagePath: pickRandom(IMAGE_UNSHUFFLE_IMAGES),
        // solution is always the identity order; the UI owns the scrambled state
        solution: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        hint: entry.hint,
    };
};

// ─────────────────────────────────────────────
//  Minigame Dispatcher
// ─────────────────────────────────────────────

function generateMinigameData(type: MinigameType): MinigameData {
  switch (type) {
    case "wordle":
      return generateWordleData();
    case "image-unshuffle":
      return generateImageUnshuffleData();
    case "cipher":
      return generateCipherData();
    default:
      throw new Error(`Unknown minigame type: ${type}`);
  }
}

function saveClueProgress(get: any) {
  void import("../useGameStore").then(({ useGameStore }) => {
    const gameStoreState = useGameStore.getState();
    const seed = gameStoreState.seed;

    if (!seed?.isSignedIn || !seed?.userId) return;

    const sessionId =
      gameStoreState.currentSessionId ||
      gameStoreState.player?.caseReport?.caseId ||
      localStorage.getItem("lastSessionId") ||
      localStorage.getItem("lastCaseId");

    if (!sessionId) return;

    const s = get();
    const clueState = Object.fromEntries(
      s.clues.map((clue: Clue) => [
        clue.id,
        {
          discovered: Boolean(clue.discovered),
          clueLost: Boolean(clue.clueLost),
        },
      ])
    );

      fetch(`http://localhost:3000/cases/${sessionId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          clueState,
          schedulerState: {
            lastFiredAt: s.lastFiredAt,
            nextFireAt: s.nextFireAt,
            timerPaused: s.timerPaused,
          }
        }),
      }).catch(() => {});
        });
}



// ─────────────────────────────────────────────
//  Notification Store
// ─────────────────────────────────────────────

interface NotificationState {
  notifications: NotificationPayload[];
  clues: Clue[];
  lastFiredAt: number | null;
  nextFireAt: number | null;
  timerPaused: boolean;

  initClues: (clues: Clue[]) => void;
  tick: (elapsed: number, totalGameDuration: number, messageCount: number) => void;
  openNotification: (id: string) => void;
  dismissNotification: (id: string) => void;
  abandonMinigame: (id: string) => void;
  resolveMinigame: (notificationId: string, success: boolean) => void;
  setTimerPaused: (paused: boolean) => void;
  hydrateSchedulerState: (schedulerState?: PersistedSchedulerState | null) => void;
  purgeExpired: () => void;
}

function clearClueNotification(clues: Clue[], clueId: string) {
  const clue = clues.find((c) => c.id === clueId);
  if (clue) clue.notificationId = undefined;
}

export const useNotificationStore = create<NotificationState>()(
  immer((set, get) => ({
    notifications: [],
    clues: [],
    lastFiredAt: null,
    nextFireAt: null,
    timerPaused: false,

    initClues(clues) {
      console.log("[notif] initClues called with", clues.length, "clues");
      set((s) => {
        s.clues = clues.map((clue) => ({
          ...clue,
          discovered: Boolean(clue.discovered),
          clueLost: Boolean(clue.clueLost),
          notificationId: undefined,
        }));
      });
    },

    tick(elapsed, totalGameDuration, messageCount) {
      const state = get();
      if (state.timerPaused) return;

      const remaining = totalGameDuration - elapsed;
      if (remaining < MESSAGE_SCHEDULE_CONFIG.minGameTimeRemaining) return;

      const nowMessageCount = messageCount;
      console.log("message count: " + messageCount);
      console.log("next fire at: " + state.nextFireAt);
      console.log("last fired at: " + state.lastFiredAt);

      if (state.nextFireAt === null) {
        const delay = randBetween(...MESSAGE_SCHEDULE_CONFIG.firstNotificationWindowMessageCount);
        set((s) => {
          s.nextFireAt = nowMessageCount + delay;
        });
        saveClueProgress(get);
        return;
      }

      if (nowMessageCount < state.nextFireAt) return;

      const pendingClueIds = new Set(
        state.notifications.filter((n) => !n.dismissed).map((n) => n.clueId)
      );

      const available = state.clues.filter(
        (c) => !c.discovered && !c.clueLost && !pendingClueIds.has(c.id) && !c.notificationId
      );

      if (available.length === 0) return;

      const clue = pickRandom(available);
      const type = pickRandom(NOTIFICATION_TYPES);
      const minigameType = pickRandom(MINIGAME_TYPES);

      const notification: NotificationPayload = {
        id: crypto.randomUUID(),
        type,
        headline: pickRandom(HEADLINES[type]),
        flavorText: pickRandom(FLAVOR_TEXTS[type]),
        clueId: clue.id,
        minigameType,
        minigameData: generateMinigameData(minigameType),
        createdAt: Date.now(),
        expiresAt: Date.now() + MESSAGE_SCHEDULE_CONFIG.toastLifetime,
        opened: false,
        dismissed: false,
      };

      set((s) => {
        const idx = s.clues.findIndex((c: { id: string }) => c.id === clue.id);
        if (idx >= 0) s.clues[idx].notificationId = notification.id;
        s.notifications.push(notification);
        s.lastFiredAt = nowMessageCount;
        s.nextFireAt = nowMessageCount + randBetween(...MESSAGE_SCHEDULE_CONFIG.cooldownMessageCount);
      });

      saveClueProgress(get);
    },

    openNotification(id) {
      set((s) => {
        const n = s.notifications.find((n: { id: string }) => n.id === id);
        if (n) {
          n.opened = true;
          s.timerPaused = true;
        }
      });
      saveClueProgress(get);
    },

    dismissNotification(id) {
      set((s) => {
        const n = s.notifications.find((n: { id: string }) => n.id === id);
        if (n) {
          n.dismissed = true;
          clearClueNotification(s.clues, n.clueId);
        }
        s.timerPaused = false;
      });
      saveClueProgress(get);
    },

            abandonMinigame(notificationId) {
            set(s => {
                const n = s.notifications.find((n: { id: string; }) => n.id === notificationId)
                if (!n) return

        n.dismissed = true;
        s.timerPaused = false;
        clearClueNotification(s.clues, n.clueId);

        const clue = s.clues.find((c: { id: string }) => c.id === n.clueId);
        if (clue) {
          clue.clueLost = true;
          console.log(clue.name, "is lost");
        }
      });

      saveClueProgress(get);
    },

    /*
    resolveMinigame() runs when a minigame ends. 
    - If success is true, it finds the clue linked to that notification and flips clue.discovered = true. 
    - Makes it appear in the evidence board. 
    - Whether success or failure, it also dismisses the notification and unpauses the timer
    */
    resolveMinigame(notificationId, success) {
      let discoveredClueId: string | null = null;

      set((s) => {
        const n = s.notifications.find((n: { id: string }) => n.id === notificationId);
        if (!n || n.dismissed) return;

        n.dismissed = true;
        s.timerPaused = false;
        clearClueNotification(s.clues, n.clueId);

        if (success) {
          const clue = s.clues.find((c: { id: string }) => c.id === n.clueId);
          if (clue) {
            clue.discovered = true;
            discoveredClueId = clue.id;
          }
        } else {
          const clue = s.clues.find((c: { id: string }) => c.id === n.clueId);
          if (clue) {
            clue.clueLost = true;
            console.log(clue.name, "is lost");
          }
        }
      });

      saveClueProgress(get);

      if (discoveredClueId) {
        void import("../useGameStore").then(({ useGameStore }) => {
          useGameStore.getState().markClueDiscovered(discoveredClueId as string);
        });
      }
    },

    setTimerPaused(paused) {
      set((s) => {
        s.timerPaused = paused;
      });
      saveClueProgress(get);
    },

    hydrateSchedulerState(schedulerState) {
      set((s) => {
        s.lastFiredAt =
          typeof schedulerState?.lastFiredAt === "number" ? schedulerState.lastFiredAt : null;
        s.nextFireAt =
          typeof schedulerState?.nextFireAt === "number" ? schedulerState.nextFireAt : null;
        s.timerPaused = Boolean(schedulerState?.timerPaused);
      });
    },

    purgeExpired() {
      const now = Date.now();
      set((s) => {
        s.notifications.forEach(
          (n: { opened: boolean; dismissed: boolean; expiresAt: number; clueId: string }) => {
            if (!n.opened && !n.dismissed && now > n.expiresAt) {
              n.dismissed = true;
              clearClueNotification(s.clues, n.clueId);
            }
          }
        );
      });
    },
  }))
);

// Selectors
export const selectActiveToast = (s: NotificationState) =>
  s.notifications.find((n) => !n.opened && !n.dismissed) ?? null;

export const selectOpenMinigame = (s: NotificationState) =>
  s.notifications.find((n) => n.opened && !n.dismissed) ?? null;

export const selectDiscoveredClues = (s: NotificationState) =>
  s.clues.filter((c) => c.discovered);