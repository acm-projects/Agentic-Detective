// This file contains all the required interfaces for the dynamic clue system
export type NotificationType = "mail"; // add more types to this later
export type MinigameType = "wordle" | "image-unshuffle" | "cipher" | "uv-scan";
import type { Clue } from '../caseFile';

export interface NotificationPayload {
    id: string;
    type: NotificationType;
    headline: string;
    flavorText: string;
    clueId: string;
    minigameType: MinigameType;
    minigameData: MinigameData;
    createdAt: number;
    expiresAt: number;
    opened: boolean;
    dismissed: boolean;
};

export type MinigameData =
  | WordleData
  | ImageUnshuffleData
  | CaesarCipherData
  | UVScanData;

export interface WordleData {
    kind: 'wordle';
    answer: string;
    maxNumGuesses: number;
    hint: string;
}

export interface ImageUnshuffleData {
    kind: 'image-unshuffle';
    imagePath: string;
    solution: number[];
    hint: string;
}

export interface CaesarCipherData {
    kind: 'cipher';
    plain: string;
    shift: number;
    clues: string[];
}

export interface UVScanData {
    kind: 'uv-scan';
    /** Footprint position as 0–1 fractions of the scene container size.
     *  If omitted the component will place it at (0.55, 0.48). */
    footprintPos?: { x: number; y: number };
    hint: string;
}

export type { Clue };