// This file contains the required interfaces for use in Interrogate.tsx

// Character Profile for the Front-End
export interface CharacterProfile {
    mugshot: string;
    name: string;
    age: number;
    occupation: string;
    knownAssociates: string[];
    chatHistory: ChatMessage[];
}

// Character Data to send to the AI
export interface CharacterAI {
    secrets: string[];
    characteristics: string[];
    knowledgeScope: string[];
    speakingStyle: string[];
    trustLevel: number;
    trustsPlayer: boolean;
    isGuilty: boolean;
}

// General Character Data
export interface CharacterData {
    id: string; // Unique Identifier for the Character
    profile: CharacterProfile;
    ai: CharacterAI;
}

// Chat Message History
export interface ChatMessage {
    question: string;
    answer: string;
}

