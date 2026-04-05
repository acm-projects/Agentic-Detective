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
const SCHEDULE_CONFIG = {
    firstNotificationWindow: [1_000, 2_000] as [number, number], // 120, 180
    cooldown: 10_000, // 90
    toastLifetime: 40_000, // Toast: a gui element that shows up, then disappears; 30
    minGameTimeRemaining: 60_000, // 60
};

// Helper Functions and Constants
function randBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

function pickRandom<T>(arr: T[]) {
    return arr[randBetween(0, arr.length - 1)];
};

const NOTIFICATION_TYPES: NotificationType[] = ["mail"];
const MINIGAME_TYPES: MinigameType[] = ["wordle", "image-unshuffle", "cipher"];

const HEADLINES: Record<NotificationType, string[]> = {
    mail: [
        'A sealed envelope was found beneath the victim\'s pillow.',
        'The postmaster delivered a letter addressed to the deceased.',
        'A crumpled note surfaced in the wastepaper basket.',
    ]
}

const FLAVOR_TEXTS: Record<NotificationType, string[]> = {
    mail: [
        'The envelope is sealed with wax — whoever wrote this wanted it kept private.',
        'To read it, you\'ll need to work through the lock.',
        'The letter appears to be written in code. Whoever sent this didn\'t want it read by the wrong eyes.',
    ]
}

// ─────────────────────────────────────────────
//  Wordle Data Generator
// ─────────────────────────────────────────────

const WORDLE_DETECTIVE_WORDS = [
    { answer: 'KNIFE', hint: 'The murder weapon may be closer than you think.' },
    { answer: 'ALIBI', hint: 'Someone\'s story doesn\'t quite add up.' },
    { answer: 'BLOOD', hint: 'The forensics report holds a grim detail.' },
    { answer: 'VAULT', hint: 'Something was locked away the night of the murder.' },
    { answer: 'CLOAK', hint: 'A witness described what the figure was wearing.' },
    { answer: 'FORGE', hint: 'A document in the study may not be authentic.' },
    { answer: 'DECOY', hint: 'Not everything found at the scene was accidental.' },
    { answer: 'GUEST', hint: 'An unexpected visitor arrived that evening.' },
    { answer: 'LYING', hint: 'One suspect\'s testimony contradicts another.' },
    { answer: 'MOTIVE', hint: 'Follow the money.' },
    { answer: 'TRACE', hint: 'A tiny piece of evidence was left behind.' },
    { answer: 'STAIN', hint: 'Something spilled during the struggle.' },
    { answer: 'PRINT', hint: 'A mark on the glass could identify the culprit.' },
    { answer: 'SCENE', hint: 'Reconstruct what happened where the body was found.' },
    { answer: 'CHASE', hint: 'Someone was seen running shortly after the crime.' },
    { answer: 'RIVAL', hint: 'The victim had a bitter competitor.' },
    { answer: 'MONEY', hint: 'A suspicious transfer happened before the murder.' },
    { answer: 'RUMOR', hint: 'Whispers around town hint at a dark secret.' },
    { answer: 'STEAL', hint: 'Was the killing tied to a theft?' },
    { answer: 'ENTRY', hint: 'How did the killer get inside?' },
    { answer: 'NOTES', hint: 'The victim wrote something important before dying.' },
    { answer: 'CLOCK', hint: 'The stopped time may reveal when it happened.' },
    { answer: 'DOORS', hint: 'One of them was left unlocked that night.' },
    { answer: 'PANEL', hint: 'A hidden compartment may conceal evidence.' },
    { answer: 'DRINK', hint: 'What the victim consumed might hold a clue.' },
];

function generateWordleData(): WordleData {
    const entry = pickRandom(WORDLE_DETECTIVE_WORDS);
    return {
        kind: 'wordle',
        answer: entry.answer.toUpperCase(),
        maxNumGuesses: 6,
        hint: entry.hint,
    };
};

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

function generateImageUnshuffleData(): ImageUnshuffleData {
    const entry = pickRandom(IMAGE_UNSHUFFLE_CLUES);
    return {
        kind: 'image-unshuffle',
        imagePath: 'assets/meme.png',
        solution: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        hint: entry.hint,
    };
};

// ─────────────────────────────────────────────
//  Cipher Data Generator
// ─────────────────────────────────────────────

const CIPHER_CLUES: { plain: string; shift: number; clues: string[] }[] = [
    { plain: 'POISON', shift: 3, clues: ['The shift is the number of sides on a triangle.', 'The answer is what ended the victim\'s life.'] },
    { plain: 'BUTLER', shift: 5, clues: ['The shift matches the fingers on one hand.', 'The answer is a household role.'] },
    { plain: 'CELLAR', shift: 7, clues: ['The shift is a lucky number.', 'The answer is where the body was hidden.'] },
    { plain: 'DAGGER', shift: 4, clues: ['The shift is the number of seasons.', 'The answer is a bladed weapon.'] },
    { plain: 'WINDOW', shift: 6, clues: ['The shift is half a dozen.', 'The answer is how the killer escaped.'] },
    { plain: 'LOCKET', shift: 2, clues: ['The shift is the number of eyes on a face.', 'The answer is a piece of jewellery found at the scene.'] },
    { plain: 'RANSOM', shift: 8, clues: ['The shift is the number of tentacles on an octopus, minus two.', 'The answer is what the letter demanded.'] },
    { plain: 'MIRROR', shift: 9, clues: ['The shift is the number of lives a cat has.', 'The answer is where the clue was hidden in plain sight.'] },
];

function generateCipherData(): CaesarCipherData {
    const entry = pickRandom(CIPHER_CLUES);
    return {
        kind: 'cipher',
        plain: entry.plain,
        shift: entry.shift,
        clues: entry.clues,
    };
};

// ─────────────────────────────────────────────
//  Minigame Dispatcher
// ─────────────────────────────────────────────

function generateMinigameData(type: MinigameType): MinigameData {
    switch (type) {
        case 'wordle':
            return generateWordleData();
        case 'image-unshuffle':
            return generateImageUnshuffleData();
        case 'cipher':
            return generateCipherData();
        default:
            throw new Error(`Unknown minigame type: ${type}`);
    };
};

function saveClueProgress(get: any) {
  const sessionId = localStorage.getItem("lastSessionId") || localStorage.getItem("lastCaseId");
  
  if (sessionId) {
    void import("../useGameStore").then(({ useGameStore }) => {
      const seed = useGameStore.getState().seed;
      if (!seed?.isSignedIn || !seed?.userId) return;

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
    tick: (elapsed: number, totalGameDuration: number) => void;
    openNotification: (id: string) => void;
    dismissNotification: (id: string) => void;
    abandonMinigame: (id: string) => void;
    resolveMinigame: (notificationId: string, success: boolean) => void;
    setTimerPaused: (paused: boolean) => void;
    purgeExpired: () => void;
};

function clearClueNotification(clues: Clue[], clueId: string) {
    const clue = clues.find(c => c.id === clueId);
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
            console.log('[notif] initClues called with', clues.length, 'clues');
            set(s => {
                s.clues = clues.map(clue => ({
                    ...clue,
                    discovered: Boolean(clue.discovered),
                    clueLost: Boolean(clue.clueLost),
                    notificationId: undefined,
                }));
            });
        },

        tick(elapsed, totalGameDuration) {
            const state = get();
            if (state.timerPaused) return;

            const remaining = totalGameDuration - elapsed;
            if (remaining < SCHEDULE_CONFIG.minGameTimeRemaining) return;

            const now = Date.now();

            if (state.nextFireAt === null) {
                const delay = randBetween(...SCHEDULE_CONFIG.firstNotificationWindow);
                set(s => { s.nextFireAt = now + delay; });
                return;
            }

            if (now < state.nextFireAt) return;

            const pendingClueIds = new Set(
                state.notifications
                    .filter(n => !n.dismissed)
                    .map(n => n.clueId)
            );
            const available = state.clues.filter(
                c => !c.discovered && !c.clueLost && !pendingClueIds.has(c.id) && !c.notificationId
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
                createdAt: now,
                expiresAt: now + SCHEDULE_CONFIG.toastLifetime,
                opened: false,
                dismissed: false,
            };

            set(s => {
                const idx = s.clues.findIndex((c: { id: string }) => c.id === clue.id);
                if (idx >= 0) s.clues[idx].notificationId = notification.id;
                s.notifications.push(notification);
                s.lastFiredAt = now;
                s.nextFireAt = now + SCHEDULE_CONFIG.cooldown + randBetween(0, 30_000);
            });
        },

        openNotification(id) {
            set(s => {
                const n = s.notifications.find((n: { id: string }) => n.id === id);
                if (n) {
                    n.opened = true;
                    s.timerPaused = true;
                }
            });
        },

        dismissNotification(id) {
            set(s => {
                const n = s.notifications.find((n: { id: string }) => n.id === id);
                if (n) {
                    n.dismissed = true;
                    clearClueNotification(s.clues, n.clueId);
                }
                s.timerPaused = false;
            });
        },

        abandonMinigame(notificationId) {
            set(s => {
                const n = s.notifications.find((n: { id: string }) => n.id === notificationId);
                if (!n) return;

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

        resolveMinigame(notificationId, success) {
            let discoveredClueId: string | null = null;
            set(s => {
                const n = s.notifications.find((n: { id: string }) => n.id === notificationId);
                if (!n) return;
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

                saveClueProgress(get);
            });

            if (discoveredClueId) {
                void import('../useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().markClueDiscovered(discoveredClueId as string);
                });
            }
        },

        setTimerPaused(paused) {
            set(s => { s.timerPaused = paused; });
        },

        purgeExpired() {
            const now = Date.now();
            set(s => {
                s.notifications.forEach((n: { opened: any; dismissed: boolean; expiresAt: number; clueId: string }) => {
                    if (!n.opened && !n.dismissed && now > n.expiresAt) {
                        n.dismissed = true;
                        clearClueNotification(s.clues, n.clueId);
                    }
                });
            });
        },
    }))
);

// Selectors
export const selectActiveToast = (s: NotificationState) =>
    s.notifications.find(n => !n.opened && !n.dismissed) ?? null;

export const selectOpenMinigame = (s: NotificationState) =>
    s.notifications.find(n => n.opened && !n.dismissed) ?? null;

export const selectDiscoveredClues = (s: NotificationState) =>
    s.clues.filter(c => c.discovered);