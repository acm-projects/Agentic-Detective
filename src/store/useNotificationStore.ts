import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  NotificationPayload,
  Clue,
  WordleData,
  ImageUnshuffleData,
  CaesarCipherData,
  UVScanData,
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
  firstNotificationWindowMessageCount: [2] as [number], // originally 5, 10
  cooldownMessageCount: [2] as [number], // originally 5, 10
  toastLifetime: 40_000,
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
const MINIGAME_TYPES: MinigameType[] = ["wordle", "image-unshuffle", "cipher", "uv-scan"];


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
  { answer: "PRINT", hint: "They didn't leave without a trace" },
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

//----------------------------------------------
const UV_SCAN_HINTS = [
  "Something was dragged across the floor near the east wall.",
  "The intruder came in from the garden — check near the doorway.",
  "A partial print was left in a hurry.",
  "The victim wasn't alone. Someone else was here.",
  "They tried to clean it up, but UV doesn't lie.",
];

const UV_SCAN_FOOTPRINT_POSITIONS = [
  { x: 0.30, y: 0.40 },
  { x: 0.55, y: 0.48 },
  { x: 0.70, y: 0.35 },
  { x: 0.42, y: 0.62 },
  { x: 0.65, y: 0.60 },
];
function generateUVScanData(): UVScanData {
  return {
    kind: 'uv-scan',
    footprintPos: pickRandom(UV_SCAN_FOOTPRINT_POSITIONS),
    hint: pickRandom(UV_SCAN_HINTS),
  };
}

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
    case "uv-scan":
      return generateUVScanData();
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
          userId: seed.userId,
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
        s.notifications = []; // these werent being reset before, causing the notification store bug
        s.lastFiredAt = null;
        s.nextFireAt = null;
        s.timerPaused = false;
      });
    },

    tick(_elapsed, _totalGameDuration, messageCount) {
      const state = get();
      if (state.timerPaused) {
        const hasBlockingNotification = state.notifications.some((n) => !n.dismissed);
        if (!hasBlockingNotification) {
          // Recover from stale persisted pause state (for example after reload/sign-in).
          set((s) => {
            s.timerPaused = false;
          });
        } else {
          return;
        }
      }

    // Removed as might cause bugs
    //   const remaining = totalGameDuration - elapsed;
    //   if (remaining < MESSAGE_SCHEDULE_CONFIG.minGameTimeRemaining) return;

      const nowMessageCount = messageCount;
      console.log("message count: " + messageCount);
      console.log("next fire at: " + state.nextFireAt);
      console.log("last fired at: " + state.lastFiredAt);

      if (state.nextFireAt === null) {
        const delay = 2;
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
      const minigameType: MinigameType = "uv-scan";

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

      setTimeout(() => {
        set((s) => {
          const idx = s.clues.findIndex((c: { id: string }) => c.id === clue.id);
          if (idx >= 0) s.clues[idx].notificationId = notification.id;
          
          s.notifications.push(notification);
          s.lastFiredAt = nowMessageCount;
          s.nextFireAt = nowMessageCount + 2000;
        });
      }, 9000);

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
        // Notifications/minigame UI is not persisted, so a persisted paused timer must not
        // block scheduling after reload.
        s.timerPaused = false;
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