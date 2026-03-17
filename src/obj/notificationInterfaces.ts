// This file contains all the required interfaces for the dynamic clue system
export type NotificationType = "mail"; // add more types to this later
export type MinigameType = "wordle";
import type { Clue } from '../caseFile';



// This carries info regarding the minigame it contains, the clue it links to, and an expiry timestamp (called a Payload in web dev)
export interface NotificationPayload {
    id: string; // cross check whether this is needed
    type: NotificationType;
    headline: string;
    flavorText: string;         // flavor text is just some additional text to give the item more "personality"
    clueId: string; 
    minigameType: MinigameType;
    minigameData: MinigameData;
    createdAt: number;
    expiresAt: number;
    opened: boolean;
    dismissed: boolean; // keeps track of whether minigame solved or not
};

export type MinigameData = WordleData; // add more minigames here

export interface WordleData {
    kind: 'wordle';
    answer: string;
    maxNumGuesses: number; // can adjust this based on difficulty?
    hint: string; // a brief phrase/sentence related to the chosen word 
}

/*
  This is the interface for discovered clues, not just all clues in general 
*/


export type { Clue }