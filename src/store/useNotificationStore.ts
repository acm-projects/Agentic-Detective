import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
    NotificationPayload,
    Clue,
    WordleData,
    NotificationType,
    MinigameData,
    MinigameType,
} from "../obj/notificationInterfaces";

// Schedule Config
const SCHEDULE_CONFIG = {
    firstNotificationWindow: [5_000, 8_000] as [number, number], // 120, 180
    cooldown: 10_000, // 90
    toastLifetime: 3000_000, // Toast: a gui element that shows up, then disappears; 30
    minGameTimeRemaining: 5_000, // 60
};

// Helper Functions and Constants
function randBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

function pickRandom<T>(arr: T[]) {
    return arr[randBetween(0, arr.length - 1)];
};

const NOTIFICATION_TYPES: NotificationType[] = ["mail"];
const MINIGAME_TYPES: MinigameType[] = ["wordle"];

const HEADLINES: Record<NotificationType, string[]> = {                 // Add more for different notification types
    mail: ['A sealed envelope was found beneath the victim\'s pillow.',
    'The postmaster delivered a letter addressed to the deceased.',
    'A crumpled note surfaced in the wastepaper basket.',
  ]}

const FLAVOR_TEXTS: Record<NotificationType, string[]> = {
    mail: ['The envelope is sealed with wax — whoever wrote this wanted it kept private.', 
        'To read it, you\'ll need to work through the lock.',
        'The letter appears to be written in code. Whoever sent this didn\'t want it read by the wrong eyes.',
    ]}

// Minigame Data Generators - Wordle
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

function generateWordleData(): WordleData {             // note to self: the colon is so that the compiler knows what data type this function returns
    const entry = pickRandom(WORDLE_DETECTIVE_WORDS);
    return {
        kind: 'wordle',
        answer: entry.answer.toUpperCase(),
        maxNumGuesses: 6,
        hint: entry.hint,
    };
};

function generateMinigameData(type: MinigameType): MinigameData {
    switch (type) {
        case 'wordle':
            return generateWordleData();
        default:
            throw new Error(`Unknown minigame type: ${type}`);
    };
};

// Notification Store
// Note for self: Any component in the app can read/write from the "store", it is an object that lives outside React
interface NotificationState {
    notifications: NotificationPayload[];
    clues: Clue[];
    lastFiredAt: number | null;
    nextFireAt: number | null;
    timerPaused: boolean;

    // Actions (function prototypes)
    initClues: (clues: Clue[]) => void; // called once after Gemini returns the story; stamps the clues array into the store
    tick: (elapsed: number, totalGameDuration: number) => void; // for detailed explanation, see definition below
    openNotification: (id: string) => void;
    dismissNotification: (id: string) => void;
    resolveMinigame: (notificationId: string, success: boolean) => void;
    setTimerPaused: (paused: boolean) => void;
    purgeExpired: () => void;
};

function clearClueNotification(clues: Clue[], clueId: string) {
  const clue = clues.find(c => c.id === clueId);
  if (clue) {
    clue.notificationId = undefined;
  }
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
        // Clone incoming clues so notification state mutations don't leak into other stores.
        s.clues = clues.map(clue => ({
          ...clue,
          discovered: Boolean(clue.discovered),
          notificationId: undefined,
        }));
      })
    },
    
    /*
    The tick() function is called every second.
    - It checks if the game timer is paused, and bails out early if so
    - Checks if enough time has passed since the last notification, and if both pass, picks a random unused clue, 
      wraps it in a NotificationPayload, and pushes it onto the notifications array. 
    - The moment that push happens, any component subscribed to selectActiveToast will re-render automatically.
    */
    tick(elapsed, totalGameDuration) {
      const state = get()
      if (state.timerPaused) return
 
      const remaining = totalGameDuration - elapsed
      if (remaining < SCHEDULE_CONFIG.minGameTimeRemaining) return
 
      const now = Date.now()
 
      // Initialise the first fire time
      if (state.nextFireAt === null) {
        const delay = randBetween(...SCHEDULE_CONFIG.firstNotificationWindow)
        set(s => { s.nextFireAt = now + delay })
        return
      }
 
      if (now < state.nextFireAt) return
 
      // Find an undiscovered clue with no pending notification
      const pendingClueIds = new Set(
        state.notifications
          .filter(n => !n.dismissed)
          .map(n => n.clueId)
      )
      const available = state.clues.filter(
        c => !c.discovered && !pendingClueIds.has(c.id) && !c.notificationId
      )
      if (available.length === 0) return
 
      const clue = pickRandom(available)
      const type = pickRandom(NOTIFICATION_TYPES)
      const minigameType = pickRandom(MINIGAME_TYPES)
 
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
      }
 
      set(s => {
        const clueIdx = s.clues.findIndex((c: { id: string; }) => c.id === clue.id)
        if (clueIdx >= 0) s.clues[clueIdx].notificationId = notification.id
        s.notifications.push(notification)
        s.lastFiredAt = now
        s.nextFireAt = now + SCHEDULE_CONFIG.cooldown + randBetween(0, 30_000)
      })
    },

    /*
    openNotification() runs when the player clicks on the toast.
    - Finds the corresponding notification in the array using its id.
    - Sets opened to true
    - Sets timerPaused to true
    */
    openNotification(id) {
      set(s => {
        const n = s.notifications.find((n: { id: string; }) => n.id === id)
        if (n) {
          n.opened = true
          s.timerPaused = true
        }
      })
    },
    
    /*
    dismissNotification() runs when the player closes the toast.
    - Sets dismissed to true
    - Unpauses the timer
    - Toast and modal both disappear
    */
    dismissNotification(id) {
      set(s => {
        const n = s.notifications.find((n: { id: string; }) => n.id === id)
        if (n) {
          n.dismissed = true
          clearClueNotification(s.clues, n.clueId)
        }
        s.timerPaused = false
      })
    },
 
    /*
    resolveMinigame() runs when a minigame ends. 
    - If success is true, it finds the clue linked to that notification and flips clue.discovered = true. 
    - Makes it appear in the evidence board. 
    - Whether success or failure, it also dismisses the notification and unpauses the timer
    */
    resolveMinigame(notificationId, success) {
      let discoveredClueId: string | null = null;
      set(s => {
        const n = s.notifications.find((n: { id: string; }) => n.id === notificationId)
        if (!n) return
        n.dismissed = true
        s.timerPaused = false
        clearClueNotification(s.clues, n.clueId)
 
        if (success) {
          const clue = s.clues.find((c: { id: string; }) => c.id === n.clueId) // cross-check this parameter type
          if (clue) {
            clue.discovered = true
            discoveredClueId = clue.id;
          }
        }
      })

      if (discoveredClueId) {
        void import("../useGameStore").then(({ useGameStore }) => {
          useGameStore.getState().markClueDiscovered(discoveredClueId as string);
        });
      }
    },
    
    /*
    Sets timer to be paused
    */
    setTimerPaused(paused) {
      set(s => { s.timerPaused = paused })
    },
 
    /*
    - loops through notifications and auto-dismisses any that have passed their expiresAt timestamp without being opened. 
    - makes the toast disappear after 30 seconds if the player ignores it.
    */
    purgeExpired() {
      const now = Date.now()
      set(s => {
        s.notifications.forEach((n: { opened: any; dismissed: boolean; expiresAt: number; clueId: string; }) => {
          if (!n.opened && !n.dismissed && now > n.expiresAt) {
            n.dismissed = true
            clearClueNotification(s.clues, n.clueId)
          }
        })
      })
    },
  }))
)


// Selectors, used by components to utilize the current state to perform an action
export const selectActiveToast = (s: NotificationState) =>
  s.notifications.find(n => !n.opened && !n.dismissed) ?? null;

export const selectOpenMinigame = (s: NotificationState) =>
  s.notifications.find(n => n.opened && !n.dismissed) ?? null;
 
export const selectDiscoveredClues = (s: NotificationState) =>
  s.clues.filter(c => c.discovered);