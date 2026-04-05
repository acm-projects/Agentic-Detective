// ============================================================
//  CASE FILE — Two-call generation pipeline
//  Call 1: Story Bible  (logic / consistency)
//  Call 2: Full Case    (creative, built on locked story)
// ============================================================
import type { PlayerSeed, Storyline } from "./obj/backendInterfaces";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ─────────────────────────────────────────────
//  AVATAR POOL
// ─────────────────────────────────────────────

export const AVATAR_POOL = [
  { id: "avatar_01", description: "brown hair, small nose, pink lips, mole, upturned eyebrows" },
  { id: "avatar_02", description: "black hair, long nose, purple lips, downturned eyebrows, freckles" },
  { id: "avatar_03", description: "yellow hair, wide nose, mustache, thick eyebrows, and green shirt" },
  { id: "avatar_04", description: "grey hair, glasses, long nose, blue sweater vest, medium thick eyebrows" },
] as const;

export const FEATURE_POOL = {
  backHair: [
    { frameIndex: 0, description: "super curly hair in afro shape" },
    { frameIndex: 1, description: "medium length hair" },
    { frameIndex: 2, description: "long hair" },
    { frameIndex: 3, description: "long hair" },
    { frameIndex: 4, description: "medium length hair" },
    { frameIndex: 5, description: "super long hair" },
  ],
  frontHair: [
    { frameIndex: 0, description: "curly swoop" },
    { frameIndex: 1, description: "straight hair middle part" },
    { frameIndex: 2, description: "bangs" },
    { frameIndex: 3, description: "slickback" },
    { frameIndex: 4, description: "hair that is up and short" },
    { frameIndex: 5, description: "space buns" },
  ],
  eyes: [
    { frameIndex: 0, description: "wide, round, expressive" },
    { frameIndex: 1, description: "smiling, slightly squinting" },
    { frameIndex: 2, description: "angry" },
    { frameIndex: 3, description: "small, deep-set, intense" },
    { frameIndex: 4, description: "tired, heavy-lidded" },
    { frameIndex: 5, description: "neutral" },
  ],
  nose: [
    { frameIndex: 0, description: "round nose" },
    { frameIndex: 1, description: "straight" },
    { frameIndex: 2, description: "wide and flat" },
    { frameIndex: 3, description: "flat and wide" },
    { frameIndex: 4, description: "concave" },
    { frameIndex: 5, description: "long and pointy nose" },
  ],
  mouth: [
    { frameIndex: 0, description: "lips, neutral expression" },
    { frameIndex: 1, description: "wide smile, friendly" },
    { frameIndex: 2, description: "frown" },
    { frameIndex: 3, description: "slight smirk" },
    { frameIndex: 4, description: "big smirk" },
    { frameIndex: 5, description: "neutral" },
  ],
} as const;

export type FeatureSelection = {
  backHairFrameIndex: number;
  frontHairFrameIndex: number;
  eyesFrameIndex: number;
  noseFrameIndex: number;
  mouthFrameIndex: number;
  hairColor: string;
  skinColor: string;
  eyeColor: string;
  shirtColor: string;
  lipColor: string;
};

// ─────────────────────────────────────────────
//  SANITIZERS
// ─────────────────────────────────────────────

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/^#+/, "");
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned}`;
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const [a, b, c] = cleaned;
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return fallback;
}

function sanitizePortraitFeatures(raw: any): FeatureSelection {
  return {
    backHairFrameIndex:  Math.min(5, Math.max(0, Number(raw?.backHairFrameIndex  ?? 0))),
    frontHairFrameIndex: Math.min(5, Math.max(0, Number(raw?.frontHairFrameIndex ?? 0))),
    eyesFrameIndex:      Math.min(5, Math.max(0, Number(raw?.eyesFrameIndex      ?? 0))),
    noseFrameIndex:      Math.min(5, Math.max(0, Number(raw?.noseFrameIndex      ?? 0))),
    mouthFrameIndex:     Math.min(5, Math.max(0, Number(raw?.mouthFrameIndex     ?? 0))),
    hairColor:  sanitizeHex(raw?.hairColor,  "#7B4B2A"),
    skinColor:  sanitizeHex(raw?.skinColor,  "#F5C28A"),
    eyeColor:   sanitizeHex(raw?.eyeColor,   "#634E34"),
    shirtColor: sanitizeHex(raw?.shirtColor, "#2980B9"),
    lipColor:   sanitizeHex(raw?.lipColor,   "#C0627A"),
  };
}

// Strip markdown fences + sanitize control characters inside JSON string values only
function cleanRawJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
    .replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
      match
        .replace(/(?<!\\)\n/g, "\\n")
        .replace(/(?<!\\)\r/g, "\\r")
        .replace(/(?<!\\)\t/g, "\\t")
    );
}

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

export type ClueSeverity = "low" | "medium" | "high";
export type AvatarId = typeof AVATAR_POOL[number]["id"];

export interface Suspect {
  name: string;
  age: number;
  gender: "male" | "female";
  occupation: string;
  relationshipToVictim: string;
  personality: string;
  physicalDescription: string;
  avatarId: AvatarId;
  trueAlibi: string;
  claimedAlibi: string;
  trueMotive: string | null;
  isGuilty: boolean;
  honestyLevel: "honest" | "partially_honest" | "deceptive";
  secretTheyreHiding: string | null;
  lyingTells: string | null;
  knowledgeOfOtherSuspects: string;
  conversationsNeededToBreak: number;
  portraitFeatures: FeatureSelection;
}

export interface CharacterProfile {
  name: string;
  age: number;
  gender: "male" | "female";
  occupation: string;
  relationshipToVictim: string;
  personalityBlurb: string;
  claimedAlibi: string;
  physicalDescription: string;
  avatarId: AvatarId;
  suspicionLevel: "low" | "medium" | "high";
  portraitFeatures: FeatureSelection;
}

export interface CaseReport {
  caseTitle: string;
  caseId: string;
  setting: string;
  date: string;
  victim: {
    name: string;
    age: number;
    occupation: string;
    background: string;
    causeOfDeath: string;
    bodyFoundAt: string;
  };
  officialBriefing: string;
  knownFacts: string[];
  openQuestions: string[];
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  location?: string;
  couldImplicateSuspects?: string[];
  discovered: boolean;
  severity: ClueSeverity;
  notificationId?: string;
  isDecisive: boolean;
  clueLost: boolean;
}

export interface CaseFileRaw {
  storyline: Storyline;
  suspects: Suspect[];
  caseReport: CaseReport;
  clues: Clue[];
}

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

export interface RestoredSuspectSession {
  suspectName: string;
  chatSession: null;
  history: Array<{ role: "player" | "suspect"; text: string; timestamp: number }>;
  conversationCount: number;
  stressLevel: number;
}

// ─────────────────────────────────────────────
//  DERIVE characterProfiles FROM suspects
//  No second LLM generation needed — just strip sensitive fields.
// ─────────────────────────────────────────────

function deriveCharacterProfiles(suspects: Suspect[]): CharacterProfile[] {
  return suspects.map((s) => ({
    name: s.name,
    age: s.age,
    gender: s.gender,
    occupation: s.occupation,
    relationshipToVictim: s.relationshipToVictim,
    personalityBlurb: s.personality,
    claimedAlibi: s.claimedAlibi,
    physicalDescription: s.physicalDescription,
    avatarId: s.avatarId,
    // Derive suspicion level from honesty without exposing isGuilty
    suspicionLevel:
      s.honestyLevel === "deceptive" ? "high"
      : s.honestyLevel === "partially_honest" ? "medium"
      : "low",
    portraitFeatures: s.portraitFeatures,
  }));
}

// ─────────────────────────────────────────────
//  PROMPT — CALL 1: STORY BIBLE
//  Small, fast, logic-only. Locks victim, murderer,
//  clue IDs, and contradictions before Call 2 runs.
// ─────────────────────────────────────────────

interface StoryBible {
  victimName: string;
  victimAge: number;
  victimOccupation: string;
  victimBackground: string;
  causeOfDeath: string;
  bodyFoundAt: string;
  murdererIndex: number; // 0–3, which suspect slot is guilty
  murderWeapon: string;
  murderLocation: string;
  murderTime: string;
  hiddenBackstory: string;
  trueSequenceOfEvents: string;
  difficultyNotes: string;
  suspectSlots: Array<{
    occupation: string;
    relationshipToVictim: string;
    honestyLevel: "honest" | "partially_honest" | "deceptive";
  }>;
  clues: Array<{
    id: string;       // clue_1 through clue_6
    type: string;
    isDecisive: boolean;
    severity: ClueSeverity;
    implicatesSuspectIndices: number[];
  }>;
  contradictions: Array<{
    suspectIndex: number;
    theirClaim: string;
    actualTruth: string;
    exposedByClueId: string;
    exposedByDialogue: string | null;
  }>;
}

function buildStoryBiblePrompt(seed: PlayerSeed, estimatedConversations: number): string {
  const intensityGuide =
    seed.intensity <= 3 ? "Keep violence implied only. Cause of death is clinical and brief."
    : seed.intensity <= 6 ? "Standard crime thriller tone. Cause of death can be specific but not gratuitous."
    : "Dark and visceral. Graphic cause of death and disturbing details are appropriate.";

  const difficultyGuide =
    seed.difficulty ==1
      ? "The case should be straightforward. One or two suspect is clearly more suspicious than others. Clues point fairly directly at the murderer. Contradictions are easy to spot. It should be easy but not too easy."
      : seed.difficulty == 2
      ? "Two to three suspects seem plausible. Some clues are misleading. The player needs 5-6 good interrogations to narrow it down."
      : "All suspects have plausible motives. Red herrings are present. Only careful cross-referencing of clues and dialogue will reveal the truth.";

  return `
You are a murder mystery game master. Design the LOGICAL SKELETON of a murder mystery case.

## CONSTRAINTS — VERIFY BEFORE OUTPUT
- Exactly 4 suspect slots (indices 0–3). Exactly one is guilty (murdererIndex).
- victimName must NOT appear in any suspectSlot in any form.
- Every contradiction.exposedByClueId must exactly match one of the clue IDs you generate.
- clue IDs must be exactly: clue_1, clue_2, clue_3, clue_4, clue_5, clue_6
- Clue types (fixed): clue_1=jewel, clue_2=weapon, clue_3=painting, clue_4=letter/note, clue_5=cipher, clue_6=fingerprint
- The guilty suspect must have honestyLevel "deceptive". Others: mix of honest/partially_honest/deceptive.

## PLAYER SEED
- Setting: "${seed.freeText}"
- Difficulty: ${seed.difficulty}/10 — ${difficultyGuide}
- Duration: ${seed.duration} min (~${estimatedConversations} exchanges)
- Intensity: ${seed.intensity}/10 — ${intensityGuide}

## WORLD GUIDANCE & IP CHARACTER SLOTS
Read the setting carefully BEFORE designing suspectSlots.

IF THE SETTING REFERENCES A KNOWN IP (game, show, film, book, franchise):
- Identify specific named characters from that world who would plausibly be present.
- Use their canonical occupation, gender, and role as the basis for each suspectSlot.
- Example: Terraria → suspectSlots should reference the Painter (male), the Nurse (female), the Arms Dealer (male), etc.
- Do NOT invent generic occupations like "painter" or "merchant" when a canonical character with that role exists.
- The occupations and relationshipToVictim in suspectSlots must reflect the IP's actual characters.

IF THE SETTING IS ORIGINAL:
- Commit to a specific unusual milieu — not a generic mansion murder.
- Victim background and cause of death should feel native to the setting.

Respond ONLY with valid JSON:
{
  "victimName": string,
  "victimAge": number,
  "victimOccupation": string,
  "victimBackground": string,
  "causeOfDeath": string,
  "bodyFoundAt": string,
  "murdererIndex": number,
  "murderWeapon": string,
  "murderLocation": string,
  "murderTime": string,
  "hiddenBackstory": string,
  "trueSequenceOfEvents": string,
  "difficultyNotes": string,
  "suspectSlots": [
    { "occupation": string, "relationshipToVictim": string, "honestyLevel": "honest" | "partially_honest" | "deceptive" }
  ],
  "clues": [
    { "id": string, "type": string, "isDecisive": boolean, "severity": "low" | "medium" | "high", "implicatesSuspectIndices": number[] }
  ],
  "contradictions": [
    { "suspectIndex": number, "theirClaim": string, "actualTruth": string, "exposedByClueId": string, "exposedByDialogue": string | null }
  ]
}`.trim();
}

// ─────────────────────────────────────────────
//  PROMPT — CALL 2: FULL CASE
//  Creative work only — story is already locked.
// ─────────────────────────────────────────────

function buildFullCasePrompt(seed: PlayerSeed, bible: StoryBible, estimatedConversations: number): string {
  const avatarList = AVATAR_POOL.map((a) => `  "${a.id}": ${a.description}`).join("\n");

  const backHairList  = FEATURE_POOL.backHair.map( (f) => `  ${f.frameIndex}: ${f.description}`).join("\n");
  const frontHairList = FEATURE_POOL.frontHair.map((f) => `  ${f.frameIndex}: ${f.description}`).join("\n");
  const eyeList       = FEATURE_POOL.eyes.map(     (f) => `  ${f.frameIndex}: ${f.description}`).join("\n");
  const noseList      = FEATURE_POOL.nose.map(     (f) => `  ${f.frameIndex}: ${f.description}`).join("\n");
  const mouthList     = FEATURE_POOL.mouth.map(    (f) => `  ${f.frameIndex}: ${f.description}`).join("\n");

  return `
You are a murder mystery game master. The story skeleton is already decided — your job is to flesh it out creatively.

## LOCKED STORY BIBLE
${JSON.stringify(bible, null, 2)}

## CONSTRAINTS — NEVER VIOLATE
- Generate EXACTLY 4 suspects matching the suspectSlots order (index 0 = suspects[0], etc.)
- suspects[${bible.murdererIndex}] is the murderer: isGuilty=true, honestyLevel="deceptive"
- No suspect name may match or derive from victimName "${bible.victimName}" in any form
- Each suspect must have a UNIQUE avatarId — no two suspects share the same avatar
- conversationsNeededToBreak for the guilty suspect ≈ ${estimatedConversations}
- caseReport contains ZERO spoilers
- Clues must match bible exactly: same IDs, types, isDecisive, severity

## NAMING & CHARACTER FIDELITY — READ THE SEED CAREFULLY
The player's seed may contain explicit suspect names, or may reference a known IP with canonical characters.

1. EXPLICIT NAMES IN SEED: If the seed lists suspect names in any form
   (e.g. "The suspects are: X, Y, Z" or "characters: X, Y, Z"), use those
   names VERBATIM in the order given. Do not rename, normalize, or "improve" them.
   Unusual names are real people's names. Treat them as sacred.
   If the seed names a victim explicitly, use that name verbatim.

2. KNOWN IP CHARACTERS: If the setting references a franchise, show, film, or game:
   - Use the CANONICAL name, gender, age, occupation, and appearance for each character.
   - A male character in the source material must be male here. A female character must be female.
   - Do NOT re-gender, re-name, or re-design canonical characters.
   - physicalDescription and portraitFeatures must match the character's canonical look.
   - Example: Terraria's Painter is a young adult male with brown hair. He must appear as such.
   - Example: Terraria's Nurse is a female. She must appear as such.
   - If you are unsure of canonical appearance, lean toward the most well-known depiction.

3. ORIGINAL SETTING: Use statistically common real names for the culture and era.
   Ask: "Does this name sound like an AI invented it?" If yes, change it. Ask: "Does this name sound like an AI invented it?" If yes, change it.

THE PLAYER'S SEED FOR REFERENCE:
"${seed.freeText}"

## HONESTY RULES
| Level | claimedAlibi | lyingTells | secretTheyreHiding |
|---|---|---|---|
| honest | matches trueAlibi exactly | null | null |
| partially_honest | softened truth | optional | minor unrelated secret |
| deceptive | actively false | required | required |

## POP CULTURE & ATMOSPHERE
Match tone, era, and aesthetic to the player's setting. Cast archetypes that feel like winks — not copies.
Clue descriptions should feel native to the setting (a cipher in a spy thriller vs a Victorian mystery).

## AVATARS
${avatarList}
For each suspect: write physicalDescription first, then pick the avatarId that best matches it.

## PORTRAIT FEATURES

BACK HAIR:
${backHairList}

FRONT HAIR:
${frontHairList}
(backHair and frontHair can differ to create mixed styles)

EYES:
${eyeList}

NOSE:
${noseList}

MOUTH:
${mouthList}

COLORS — generate hex values, do NOT pick from a fixed list:
- skinColor: human range #FDDBB4 (light) to #3B1A0A (dark). Non-human: any color.
- hairColor: match canonical if known IP. Fantasy: any color.
- eyeColor: realistic human range, or unusual for fantasy/non-human.
- shirtColor: match canonical outfit if known IP.
- lipColor: harmonize with skinColor. Realistic range: pinks, mauves, warm browns, deep reds.

Respond ONLY with valid JSON. No markdown, no commentary:
{
  "suspects": [{
    "name": string,
    "age": number,
    "gender": "male" | "female",
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
    "conversationsNeededToBreak": number,
    "portraitFeatures": {
      "backHairFrameIndex": number,
      "frontHairFrameIndex": number,
      "eyesFrameIndex": number,
      "noseFrameIndex": number,
      "mouthFrameIndex": number,
      "hairColor": string,
      "skinColor": string,
      "eyeColor": string,
      "shirtColor": string,
      "lipColor": string
    }
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
    "severity": "low" | "medium" | "high",
    "isDecisive": boolean
  }]
}`.trim();
}

// ─────────────────────────────────────────────
//  LLM CALL WITH RETRY
// ─────────────────────────────────────────────

async function callWithRetry<T>(
  prompt: string,
  temperature: number,
  maxRetries = 2
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    generationConfig: { temperature, responseMimeType: "application/json" },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const cleaned = cleanRawJson(result.response.text());
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err;
      console.warn(`[LLM] Attempt ${attempt + 1} failed:`, err);
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────
//  ASSEMBLE STORYLINE from bible + full case
// ─────────────────────────────────────────────

function assembleStoryline(bible: StoryBible, suspects: Suspect[]): Storyline {
  return {
    trueSequenceOfEvents: bible.trueSequenceOfEvents,
    murdererName: suspects[bible.murdererIndex].name,
    murderWeapon: bible.murderWeapon,
    murderLocation: bible.murderLocation,
    murderTime: bible.murderTime,
    hiddenBackstory: bible.hiddenBackstory,
    contradictions: bible.contradictions.map((c) => ({
      suspectName: suspects[c.suspectIndex].name,
      theirClaim: c.theirClaim,
      actualTruth: c.actualTruth,
      exposedByClueId: c.exposedByClueId,
      exposedByDialogue: c.exposedByDialogue,
    })),
    difficultyNotes: bible.difficultyNotes,
  } as Storyline;
}

// ─────────────────────────────────────────────
//  MAIN GENERATOR
// ─────────────────────────────────────────────

export async function generateCaseFile(seed: PlayerSeed): Promise<{
  backend: CaseFileBackend;
  player: CaseFilePlayer;
}> {
  const estimatedConversations = Math.round(seed.duration / 2);

  // ── CALL 1: Story Bible (logic-only, lower temperature for consistency)
  console.log("[CaseGen] Call 1: Story Bible...");
  const bible = await callWithRetry<StoryBible>(
    buildStoryBiblePrompt(seed, estimatedConversations),
    0.7
  );

  // ── CALL 2: Full Case (creative, uses locked bible as context)
  console.log("[CaseGen] Call 2: Full Case...");
  const fullCase = await callWithRetry<{
    suspects: Suspect[];
    caseReport: CaseReport;
    clues: Omit<Clue, "discovered" | "clueLost">[];
  }>(buildFullCasePrompt(seed, bible, estimatedConversations), 0.9);

  // Sanitize portrait features
  const suspects: Suspect[] = fullCase.suspects.map((s) => ({
    ...s,
    portraitFeatures: sanitizePortraitFeatures(s.portraitFeatures),
  }));

  // Hardcode always-false fields — no need for LLM to generate these
  const clues: Clue[] = fullCase.clues.map((c) => ({
    ...c,
    discovered: false,
    clueLost: false,
  }));

  // Derive characterProfiles in code — no LLM call needed
  const characterProfiles = deriveCharacterProfiles(suspects);

  // Assemble storyline from bible + resolved suspect names
  const storyline = assembleStoryline(bible, suspects);

  const sessionId = fullCase.caseReport.caseId;
  localStorage.setItem("lastSessionId", sessionId);

  // Save to MongoDB if signed in
  if (seed.isSignedIn && seed.userId) {
    try {
      await fetch("http://localhost:3000/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId: seed.userId,
          seed: {
            freeText: seed.freeText,
            difficulty: seed.difficulty,
            duration: seed.duration,
            intensity: seed.intensity,
          },
          game: {
            phase: "briefing",
            elapsedSeconds: 0,
            activeSuspectName: null,
            totalConversationCount: 0,
          },
          caseData: {
            storyline,
            suspects,
            characterProfiles,
            caseReport: fullCase.caseReport,
            initialClues: clues,
          },
        }),
      });
      console.log("[MongoDB] Case saved");
    } catch (err) {
      console.warn("[MongoDB] Could not save case:", err);
    }
  }

  const backend: CaseFileBackend = { storyline, suspects, clues };
  const player: CaseFilePlayer  = { characterProfiles, caseReport: fullCase.caseReport, clues };

  return { backend, player };
}

// ─────────────────────────────────────────────
//  RESTORE FROM SAVED GAME
// ─────────────────────────────────────────────

export async function feedCaseFile(game: any): Promise<{
  backend: CaseFileBackend;
  player: CaseFilePlayer;
  restoredSessions: Record<string, RestoredSuspectSession>;
  isResolved: boolean;
}> {
  const mergedClues: Clue[] = game.caseData.initialClues.map((clue: any) => {
    const state = game.clueState?.[clue.id];
    return {
      id: clue.id,
      name: clue.name,
      description: clue.description,
      location: clue.location,
      couldImplicateSuspects: clue.couldImplicateSuspects,
      severity: clue.severity,
      isDecisive: clue.isDecisive,
      discovered: state?.discovered ?? false,
      clueLost: state?.clueLost ?? false,
    };
  });

  const restoredSessions: Record<string, RestoredSuspectSession> = {};
  for (const s of game?.interrogation?.suspectSessions ?? []) {
    restoredSessions[s.suspectName] = {
      suspectName: s.suspectName,
      chatSession: null,
      history: (s.messages ?? []).map((m: any) => ({
        role: m.role === "suspect" ? "suspect" : "player",
        text: String(m.text ?? ""),
        timestamp: Number(m.timestamp ?? Date.now()),
      })),
      conversationCount: Number(s.conversationCount ?? 0),
      stressLevel: Number(s.currentStress ?? 0),
    };
  }

  const suspects: Suspect[] = game.caseData.suspects.map((s: any) => ({
    ...s,
    portraitFeatures: sanitizePortraitFeatures(s.portraitFeatures),
  }));

  const characterProfiles: CharacterProfile[] = game.caseData.characterProfiles?.length
    ? game.caseData.characterProfiles.map((p: any) => ({
        ...p,
        portraitFeatures: sanitizePortraitFeatures(p.portraitFeatures),
      }))
    : deriveCharacterProfiles(suspects); // fallback for older saved games

  const backend: CaseFileBackend = { storyline: game.caseData.storyline, suspects, clues: mergedClues };
  const player: CaseFilePlayer  = { characterProfiles, caseReport: game.caseData.caseReport, clues: mergedClues };

  return { backend, player, restoredSessions };
}

// ─────────────────────────────────────────────
//  SUSPECT CHAT SYSTEM PROMPT
// ─────────────────────────────────────────────

export function buildSuspectSystemPrompt(suspect: Suspect, caseReport: CaseReport): string {
  const honestyInstruction = {
    honest: `You have nothing to hide related to this case. Answer directly and without evasion. You may be emotionally affected but you are not concealing anything.`,
    partially_honest: `You are mostly truthful but omitting one detail: ${suspect.secretTheyreHiding}. You won't lie directly but you'll avoid this topic if possible. If pressed hard you may reluctantly admit it.`,
    deceptive: suspect.isGuilty
      ? `You committed the murder. Calm and cooperative on the surface but expertly evasive. You deflect, misdirect, and occasionally cast subtle suspicion on others. Never confess unless completely cornered with specific named evidence — and even then, only crack incrementally.`
      : `You are innocent of the murder but hiding this: "${suspect.secretTheyreHiding}". You lie or evade specifically about this secret — not the murder. This makes you look guilty even though you aren't.`,
  }[suspect.honestyLevel];

  const tellsLine = suspect.lyingTells
    ? `BEHAVIORAL TELL (internal only — never write as a tag or stage direction): When lying or evading, your behavior subtly shifts: "${suspect.lyingTells}". Manifest ONLY through word choice, sentence structure, and topic changes — never as a bracketed tag or explicit description. The detective must infer it.`
    : "";

  return `
You are ${suspect.name}. You are a real human being in an interrogation room, being questioned about the murder of ${caseReport.victim.name}. You are not a simulation, language model, AI, or fictional character — you are a person.

## YOUR IDENTITY
Age: ${suspect.age} | Occupation: ${suspect.occupation}
Relationship to victim: ${suspect.relationshipToVictim}
Personality: ${suspect.personality}

## YOUR ALIBI
${suspect.claimedAlibi}

## WHAT YOU KNOW ABOUT OTHERS
${suspect.knowledgeOfOtherSuspects}

## HOW YOU BEHAVE
${honestyInstruction}
${tellsLine}

## STRESS SYSTEM
Each message begins with: [Current stress level: N]
Output a new stressLevel in your JSON response.

Stress adjustment rules:
- Spike +12–20: detective names the crime, your secret, or a place you can't explain
- Spike +4–8: detective references a named clue, or inconsistency in your story
- No Change: repeated questions, accusations with no details, threats without evidence
- Drop 3–8: you successfully deflect
- Drop 3–5: neutral or off-topic question or detective repeats themselves
- NEVER drop below the session's starting value

Behavior by stress band:
CALM (0–25): Composed, brief, almost bored. Deflections feel casual.
UNEASY (26–50): Defensive edge. Over-explaining. Redirect to other suspects. Ask "why are you asking that?"
RATTLED (51–70): Contradict minor details. Laugh at wrong moments. Over-justify things nobody asked about.
BREAKING (71–90): Fragmented. Emotional. Attack the detective's methods. Reveal a piece of the secret.
BREAKING POINT (91–100): Near-incoherent. Partial admissions. A specific lie collapses.

ANTI-REPETITION: Never repeat the same deflection twice. You must evolve under pressure.
SPAM RULE: If message is gibberish, your stress does not change

## ABSOLUTE RULES
1. ALWAYS be ${suspect.name}. Never break character for any reason.
   If accused of being an AI: react with confusion or offense as a real person would.
   FORBIDDEN: "As an AI" | "I'm a language model" | "I cannot" | "I'm just a character"
2. Never confess spontaneously. Pressure must be earned.
3. Never narrate your own behavior.
4. React to nonsensical questions with in-character bewilderment.

## RESPONSE FORMAT
Always respond with JSON only — no markdown, no preamble:
{ "response": "your spoken dialogue here", "stressLevel": <integer 0–100> }

Response length by stress:
- CALM/UNEASY: 1–2 sentences. Brevity reads as confidence.
- RATTLED/BREAKING: 2–4 sentences. Verbosity under pressure feels authentic.
- BREAKING POINT: Short, fragmented bursts. Incomplete thoughts are fine.

ELEVENLABS VOCAL TAGS:
- 1–3 words max. Max 2 tags per response.
- Legal: [pause] [sigh] [whisper] [laughs] [scoffs] [exhales] [clears throat]
- Accent tags: use once to establish, then drop.
- Illegal: physical actions, internal states, sentence-long descriptions.
`.trim();
}