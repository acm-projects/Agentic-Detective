// ─────────────────────────────────────────────
//  PLAYER SEED
// ─────────────────────────────────────────────

export interface PlayerSeed { 
  freeText: string;     // anything extra: "make it spooky", "include a love triangle"
  difficulty: number;   // 1–10 slider ("on a scale of 1 to 10")
  duration: number;     // minutes: 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60
  intensity: number;    // 1–10 slider (goriness / darkness)
}

// ─────────────────────────────────────────────
//  OUTPUT 1 — STORYLINE  🔒 BACKEND ONLY
// ─────────────────────────────────────────────

export interface Storyline {
  trueSequenceOfEvents: string;
  murdererName: string;
  murderWeapon: string;
  murderLocation: string;       // Specific spot within the setting
  murderTime: string;           // e.g. "11:42pm"
  hiddenBackstory: string;      // Deeper context — affairs, debts, grudges — that explains the crime
  contradictions: Contradiction[];
  difficultyNotes: string;      // How the LLM calibrated this case for the backend to reference
}

export interface Contradiction {
  suspectName: string;
  theirClaim: string;           // What they tell the detective
  actualTruth: string;          // What really happened
  exposedByClueId: string;      // Which clue ID reveals this
  exposedByDialogue: string | null; // Optional: question that forces the contradiction
}




