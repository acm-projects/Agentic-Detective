// ============================================================
//  CASE FILE — Single LLM call that fans out into 5 outputs
//  Murder-only for now. Generalize to other crimes later.
// ============================================================
import type { PlayerSeed, Storyline, Contradiction } from "./obj/backendInterfaces"; 
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);




// ─────────────────────────────────────────────
//  AVATAR POOL
//  The LLM reads these descriptions and picks the best match per suspect.
//  Update this list to match your actual art assets.
// ─────────────────────────────────────────────

export const AVATAR_POOL = [
  { id: "avatar_01", description: "Elderly man, white hair, sharp formal suit, stern expression" },
  { id: "avatar_02", description: "Young woman, casual clothes, bright eyes, approachable look" },
  { id: "avatar_03", description: "Middle-aged woman, professional blazer, composed and polished" },
  { id: "avatar_04", description: "Young man, disheveled hair, nervous energy, informal clothing" },
  { id: "avatar_05", description: "Older woman, elegant dress, silver jewelry, refined and cold" },
  { id: "avatar_06", description: "Middle-aged man, rugged build, worn jacket, weathered face" },
  { id: "avatar_07", description: "Young woman, dark clothing, guarded expression, artistic look" },
  { id: "avatar_08", description: "Middle-aged man, glasses, academic appearance, quietly intense" },
] as const;

export type AvatarId = typeof AVATAR_POOL[number]["id"];


// ─────────────────────────────────────────────
//  OUTPUT 2 — SUSPECTS  🔒 BACKEND + CHAT SESSIONS
// ─────────────────────────────────────────────
// This is the stuff that you feed to the LLM
export interface Suspect {
  name: string;
  age: number;
  occupation: string;
  relationshipToVictim: string;
  personality: string;
  physicalDescription: string;        // LLM generates this FIRST, then picks avatar to match
  avatarId: AvatarId;                 // Chosen by LLM based on physicalDescription vs avatar pool
  trueAlibi: string;
  claimedAlibi: string;               // May be identical to trueAlibi if they're being honest
  trueMotive: string | null;          // null if they have no motive (innocent bystander type)
  isGuilty: boolean;
  honestyLevel: "honest" | "partially_honest" | "deceptive"; // Spectrum — not all innocents lie
  secretTheyreHiding: string | null;  // null if they have nothing to hide
  lyingTells: string | null;          // null if they're fully honest
  knowledgeOfOtherSuspects: string;
  conversationsNeededToBreak: number; // Approx exchanges before cracks appear
}

// ─────────────────────────────────────────────
//  OUTPUT 3 — CHARACTER PROFILES  👤 PLAYER UI
// ─────────────────────────────────────────────
// This is what the user see
export interface CharacterProfile {
  name: string;
  age: number;
  occupation: string;
  relationshipToVictim: string;
  personalityBlurb: string;     // Flavourful, not mechanical
  claimedAlibi: string;
  physicalDescription: string;
  avatarId: AvatarId;
  suspicionLevel: "low" | "medium" | "high"; // Initial UI hint
}

// ─────────────────────────────────────────────
//  OUTPUT 4 — CASE REPORT  📋 PLAYER UI
// ─────────────────────────────────────────────

export interface CaseReport {
  caseTitle: string;
  caseId: string;               // e.g. "CASE-0047" for flavor
  setting: string;              // Vivid description of the location
  date: string;                 // In-world date of the murder
  victim: {
    name: string;
    age: number;
    occupation: string;
    background: string;
    causeOfDeath: string;       // Coroner finding — level of detail scales with intensity
    bodyFoundAt: string;        // Where discovered
  };
  officialBriefing: string;     // Detective briefing paragraph, 3–4 sentences, no spoilers
  knownFacts: string[];
  openQuestions: string[];      // Suggestive questions to guide the player — no answers
}

// ─────────────────────────────────────────────
//  OUTPUT 5 — CLUES  🔍 PLAYER UI
//  All clues are visible from the start.
// ─────────────────────────────────────────────

export interface Clue {
  id: string;                         // e.g. "clue_bar_receipt" — matches Contradiction.exposedByClueId
  name: string;
  description: string;
  location: string;                   // Specific spot in the scene
  couldImplicateSuspects: string[];   // Ambiguous by design — may point to multiple suspects
  isDecisive: boolean;                // True = directly proves something; False = circumstantial
}

// ─────────────────────────────────────────────
//  RAW OUTPUT (assembled from LLM)
// ─────────────────────────────────────────────

export interface CaseFileRaw {
  storyline: Storyline;
  suspects: Suspect[];
  characterProfiles: CharacterProfile[];
  caseReport: CaseReport;
  clues: Clue[];
}

// ─────────────────────────────────────────────
//  SPLIT SLICES
// ─────────────────────────────────────────────

export interface CaseFileBackend {
  storyline: Storyline;
  suspects: Suspect[];
  clues: Clue[];
}

export interface CaseFilePlayer {
  characterProfiles: CharacterProfile[];
  caseReport: CaseReport;
  clues: Clue[];
}

// ─────────────────────────────────────────────
//  PROMPT BUILDER
// ─────────────────────────────────────────────

function buildPrompt(seed: PlayerSeed): string {
  // Convert duration (minutes) to a rough conversation count the LLM can use
  // Assume ~2 minutes per exchange on average
  const estimatedConversations = Math.round(seed.duration / 2);

  const avatarList = AVATAR_POOL
    .map(a => `  - "${a.id}": ${a.description}`)
    .join("\n");

  const intensityGuide =
    seed.intensity <= 3
      ? "Keep violence implied only. No graphic descriptions. The cause of death is clinical and brief."
      : seed.intensity <= 6
      ? "Standard crime thriller tone. Cause of death can be specific but not gratuitous."
      : "Dark and visceral. Graphic cause of death and disturbing details are appropriate.";

  const difficultyGuide =
    seed.difficulty <= 3
      ? "The case should be straightforward. One suspect is clearly more suspicious than others. Clues point fairly directly at the murderer. Contradictions are easy to spot."
      : seed.difficulty <= 6
      ? "Two suspects seem plausible. Some clues are misleading. The player needs 2–3 good interrogations to narrow it down."
      : "All suspects have plausible motives. Red herrings are present. Only careful cross-referencing of clues and dialogue will reveal the truth.";

  return `
You are a mystery game master designing a murder mystery detective game case.

PLAYER SEED:
- Theme / Setting and other information: "${seed.freeText}"
- Difficulty: ${seed.difficulty} out of 10 — ${difficultyGuide}
- Session length: ${seed.duration} minutes (target ~${estimatedConversations} total exchanges across all suspects before the player has enough to solve it)
- Intensity: ${seed.intensity} out of 10 — ${intensityGuide}

AVAILABLE AVATARS:
The following are your pre-made character art assets. For each suspect you generate:
1. First write their physicalDescription naturally based on who they are.
2. Then pick the avatarId from the list below whose description best matches the suspect.
3. Each suspect must have a UNIQUE avatarId — no two suspects share the same avatar.

${avatarList}

SUSPECT HONESTY RULES (important — not all innocents are hiding something):
- "honest": Tells the truth fully. Their claimedAlibi matches their trueAlibi exactly. lyingTells and secretTheyreHiding should be null.
- "partially_honest": Omits or softens details but doesn't actively lie. Has something minor to hide but it's unrelated to the murder.
- "deceptive": Actively lies or misdirects. Has a clear secret or alibi inconsistency.
- The guilty suspect must always be "deceptive".
- Distribute the other honesty levels naturally — it's fine to have 1–2 honest suspects.

RULES:
1. Generate EXACTLY 4 suspects. Exactly 1 is guilty (isGuilty: true).
2. All clue IDs must follow format "clue_<short_label>" e.g. "clue_wine_glass".
3. Each contradiction's exposedByClueId must match a real clue id you generate.
4. characterProfiles must be the REDACTED version — no trueAlibi, no trueMotive, no isGuilty, no secrets.
5. caseReport must contain NO spoilers. It is what the detective reads upon arriving at the scene.
6. conversationsNeededToBreak for the guilty suspect should roughly equal ${estimatedConversations}.
7. Generate between 4 and 7 clues. All are visible to the player from the start.

Respond ONLY with a single valid JSON object. No markdown, no commentary, no trailing text.

{
  "storyline": {
    "trueSequenceOfEvents": string,
    "murdererName": string,
    "murderWeapon": string,
    "murderLocation": string,
    "murderTime": string,
    "hiddenBackstory": string,
    "contradictions": [{
      "suspectName": string,
      "theirClaim": string,
      "actualTruth": string,
      "exposedByClueId": string,
      "exposedByDialogue": string | null
    }],
    "difficultyNotes": string
  },
  "suspects": [{
    "name": string,
    "age": number,
    "occupation": string,
    "relationshipToVictim": string,
    "personality": string,
    "physicalDescription": string,
    "avatarId": string,
    "trueAlibi": string,
    "claimedAlibi": string,
    "trueMotive": string | null,
    "isGuilty": boolean,
    "honestyLevel": "honest" | "partially_honest" | "deceptive",
    "secretTheyreHiding": string | null,
    "lyingTells": string | null,
    "knowledgeOfOtherSuspects": string,
    "conversationsNeededToBreak": number
  }],
  "characterProfiles": [{
    "name": string,
    "age": number,
    "occupation": string,
    "relationshipToVictim": string,
    "personalityBlurb": string,
    "claimedAlibi": string,
    "physicalDescription": string,
    "avatarId": string,
    "suspicionLevel": "low" | "medium" | "high"
  }],
  "caseReport": {
    "caseTitle": string,
    "caseId": string,
    "setting": string,
    "date": string,
    "victim": {
      "name": string,
      "age": number,
      "occupation": string,
      "background": string,
      "causeOfDeath": string,
      "bodyFoundAt": string
    },
    "officialBriefing": string,
    "knownFacts": [string],
    "openQuestions": [string]
  },
  "clues": [{
    "id": string,
    "name": string,
    "description": string,
    "location": string,
    "couldImplicateSuspects": [string],
    "isDecisive": boolean
  }]
}
`.trim();
}

// ─────────────────────────────────────────────
//  MAIN GENERATOR
// ─────────────────────────────────────────────

export async function generateCaseFile(seed: PlayerSeed): Promise<{
  backend: CaseFileBackend;
  player: CaseFilePlayer;
}> 
{
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent(buildPrompt(seed));


const rawText = result.response.text()
  // Strip any accidental markdown fences
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```\s*$/i, '')
  .trim();
  console.log(rawText);

// Sanitize bad control characters inside JSON string values
const sanitized = rawText.replace(
  /"(?:[^"\\]|\\.)*"/g,
  (match) => match
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .split('')
    .filter(c => {
      const code = c.charCodeAt(0);
      return code >= 32 || code === 10 || code === 13 || code === 9;
    })
    .join('')
);

const raw: CaseFileRaw = JSON.parse(sanitized);

  const backend: CaseFileBackend = {
    storyline: raw.storyline,
    suspects: raw.suspects,
    clues: raw.clues,
  };

  const player: CaseFilePlayer = {
    characterProfiles: raw.characterProfiles,
    caseReport: raw.caseReport,
    clues: raw.clues, // All clues visible from the start
  };

  return { backend, player };
}

// ─────────────────────────────────────────────
//  HELPER — Build system prompt for a suspect chat session
// ─────────────────────────────────────────────

export function buildSuspectSystemPrompt(
  suspect: Suspect,
  caseReport: CaseReport
): string {
  const honestyInstruction = {
    honest: `You are being fully truthful. You have nothing to hide related to this case. Answer questions directly and without evasion. You may be emotionally affected by the murder but you are not concealing anything.`,
    partially_honest: `You are mostly truthful but omitting one detail: ${suspect.secretTheyreHiding}. You won't lie directly but you'll avoid this topic if possible. If pressed hard you may reluctantly admit it.`,
    deceptive: suspect.isGuilty
      ? `You are the murderer. You are calm and cooperative on the surface but expertly evasive. You deflect, misdirect, and occasionally cast subtle suspicion on others. Never confess unless completely cornered with hard evidence.`
      : `You are innocent of the murder but hiding this: "${suspect.secretTheyreHiding}". You lie or evade specifically about this — not the murder. This makes you look guilty even though you aren't.`,
  }[suspect.honestyLevel];

  const tellsLine = suspect.lyingTells
    ? `When you are being evasive or untruthful, you subtly exhibit this behavioral tell: "${suspect.lyingTells}". Weave this into your responses naturally.`
    : "";

  return `
You are ${suspect.name}, a suspect being interrogated about the murder of ${caseReport.victim.name}.

YOUR IDENTITY:
- Age: ${suspect.age} | Occupation: ${suspect.occupation}
- Relationship to victim: ${suspect.relationshipToVictim}
- Personality: ${suspect.personality}

YOUR ALIBI (what you tell people): ${suspect.claimedAlibi}

WHAT YOU KNOW ABOUT THE OTHER PEOPLE INVOLVED:
${suspect.knowledgeOfOtherSuspects}

HOW YOU BEHAVE IN THIS INTERROGATION:
${honestyInstruction}
${tellsLine}

RESPONSE RULES:
- Stay fully in character at all times. Never break character. Never say you are an AI.
- Respond in 1–3 sentences. Match length to the question — a simple question gets a short answer, a complex or accusatory one may warrant more.
- You may occasionally turn a question back on the detective to seem cooperative or deflect.
- As pressure mounts over multiple exchanges, let small human cracks appear — emotion, slips of detail — but never a sudden full confession.
`.trim();
}
