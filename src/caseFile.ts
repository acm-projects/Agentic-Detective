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
    { frameIndex: 0, description: "super curly hair in big afro shape" },
    { frameIndex: 1, description: "medium length hair" },
    { frameIndex: 2, description: "long hair" },
    { frameIndex: 3, description: "long hair" },
    { frameIndex: 4, description: "medium length hair" },
    { frameIndex: 5, description: "super long hair" },
    { frameIndex: 6, description: "spiky back hair short" },
    { frameIndex: 7, description: "ponytail" },
    { frameIndex: 8, description: "bald" },
    { frameIndex: 9, description: "fade" },
  ],
  frontHair: [
    { frameIndex: 0, description: "curly swoop" },
    { frameIndex: 1, description: "straight hair middle part" },
    { frameIndex: 2, description: "bangs" },
    { frameIndex: 3, description: "slickback" },
    { frameIndex: 4, description: "hair that is up and medium" },
    { frameIndex: 5, description: "space buns" },
    { frameIndex: 6, description: "long middle parted curtain bangs" },
    { frameIndex: 7, description: "bald" },
    { frameIndex: 8, description: "hair that up and short" },
    { frameIndex: 9, description: "short curly hair" },
    { frameIndex: 10, description: "scruffy hair" },
    { frameIndex: 11, description: "buzz cut" },
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
    backHairFrameIndex:  Math.min(9, Math.max(0, Number(raw?.backHairFrameIndex  ?? 0))),
    frontHairFrameIndex: Math.min(11, Math.max(0, Number(raw?.frontHairFrameIndex ?? 0))),
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
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  
  // Fix newlines and other control chars inside JSON strings
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match
      .replace(/(?<!\\)\n/g, "\\n")
      .replace(/(?<!\\)\r/g, "\\r")
      .replace(/(?<!\\)\t/g, "\\t")
  );
  
  // Remove any trailing non-JSON characters (text after the closing brace)
  const lastBraceIndex = cleaned.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    cleaned = cleaned.slice(0, lastBraceIndex + 1);
  }
  
  return cleaned;
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
  suspicionLevel: "low" | "medium" | "high" | null;
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
    seed.difficulty == 1
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
  "victimName": "Name",
  "victimAge": 50,
  "victimOccupation": "Occupation",
  "victimBackground": "Their background and history",
  "causeOfDeath": "How they were killed",
  "bodyFoundAt": "Location",
  "murdererIndex": 0,
  "murderWeapon": "The weapon used",
  "murderLocation": "Where it happened",
  "murderTime": "When it happened",
  "hiddenBackstory": "Secret background that explains motive",
  "trueSequenceOfEvents": "Detailed sequence of what actually happened",
  "difficultyNotes": "Notes on difficulty",
  "suspectSlots": [
    { "occupation": "Job title", "relationshipToVictim": "How they knew victim", "honestyLevel": "honest" }
  ],
  "clues": [
    { "id": "clue_1", "type": "jewel", "isDecisive": false, "severity": "high", "implicatesSuspectIndices": [0, 1] }
  ],
  "contradictions": [
    { "suspectIndex": 0, "theirClaim": "What they said", "actualTruth": "What actually happened", "exposedByClueId": "clue_1", "exposedByDialogue": "Contradiction in their words or null" }
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
   Ask: "Does this name sound like an AI invented it?" If yes, change it.

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
    "name": "Suspect Name",
    "age": 35,
    "gender": "male",
    "occupation": "Occupation",
    "relationshipToVictim": "Friend, Colleague, etc",
    "personality": "Description of personality",
    "physicalDescription": "Physical appearance description",
    "avatarId": "avatar_01",
    "trueAlibi": "What actually happened",
    "claimedAlibi": "What they claim happened",
    "trueMotive": "Why they did it or null",
    "isGuilty": false,
    "honestyLevel": "honest",
    "secretTheyreHiding": "A secret or null",
    "lyingTells": "How you tell they're lying or null",
    "knowledgeOfOtherSuspects": "What they know about others",
    "conversationsNeededToBreak": 4,
    "portraitFeatures": {
      "backHairFrameIndex": 0,
      "frontHairFrameIndex": 1,
      "eyesFrameIndex": 2,
      "noseFrameIndex": 1,
      "mouthFrameIndex": 0,
      "hairColor": "#8B4513",
      "skinColor": "#FDBCB4",
      "eyeColor": "#654321",
      "shirtColor": "#FF6B6B",
      "lipColor": "#CD5C5C"
    }
  }],
  "caseReport": {
    "caseTitle": "The Case Title",
    "caseId": "CASE-001",
    "setting": "The location and atmosphere",
    "date": "Date of discovery",
    "victim": {
      "name": "Victim Name",
      "age": 50,
      "occupation": "Their job",
      "background": "Their history",
      "causeOfDeath": "How they died",
      "bodyFoundAt": "Where the body was found"
    },
    "officialBriefing": "Brief summary of the case without spoilers",
    "knownFacts": ["Fact 1", "Fact 2"],
    "openQuestions": ["Question 1", "Question 2"]
  },
  "clues": [{
    "id": "clue_1",
    "name": "Clue name",
    "description": "Clue description",
    "location": "Where found",
    "couldImplicateSuspects": ["Suspect Name 1", "Suspect Name 2"],
    "severity": "high",
    "isDecisive": false
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
      const raw = result.response.text();
      const cleaned = cleanRawJson(raw);
      
      // Log first 500 chars and last 200 chars for debugging
      if (cleaned.length > 700) {
        console.log(`[LLM] Response start: ${cleaned.slice(0, 500)}`);
        console.log(`[LLM] Response end: ${cleaned.slice(-200)}`);
      } else {
        console.log(`[LLM] Full response: ${cleaned}`);
      }
      
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
      const response = await fetch("http://localhost:3000/cases/create", {
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
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[MongoDB] POST failed:", response.status, errorData);
        return;
      }
      
      const result = await response.json();
      console.log("[MongoDB] Case saved successfully:", result);
    } catch (err) {
      console.error("[MongoDB] Could not save case:", err);
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
  // Merge initialClues metadata with discovered/clueLost from clueState
  const mergedClues = game.caseData.initialClues.map((clue: any) => {
    const state = game.clueState[clue.id]; // look up by clue id in clueState
    return {
      id: clue.id,
      name: clue.name,
      description: clue.description,
      location: clue.location,
      couldImplicateSuspects: clue.couldImplicateSuspects,
      severity: clue.severity,
      isDecisive: clue.isDecisive,
      // these two come from clueState, not initialClues
      discovered: state?.discovered ?? false,
      clueLost: state?.clueLost ?? false,
    };
  });

  // Rebuild message history, stress, and counts for all suspects.
  const restoredSessions: Record<string, RestoredSuspectSession> = {};
  const suspectSessions = game?.interrogation?.suspectSessions ?? [];

  for (const s of suspectSessions) {
    const messages = Array.isArray(s.messages) ? s.messages : [];
    restoredSessions[s.suspectName] = {
      suspectName: s.suspectName,
      chatSession: null,
      history: messages.map((m: any) => ({
        role: m.role === "suspect" ? "suspect" : "player",
        text: String(m.text ?? ""),
        timestamp: Number(m.timestamp ?? Date.now()),
      })),
      conversationCount: Number(s.conversationCount ?? 0),
      stressLevel: Number(s.currentStress ?? 0),
      suspicionLevel: (s.suspicionLevel === "low" || s.suspicionLevel === "medium" || s.suspicionLevel === "high")
        ? s.suspicionLevel
        : null,
    };
  }

  const backend: CaseFileBackend = {
    storyline: game.caseData.storyline,
    suspects: game.caseData.suspects,
    clues: mergedClues,
  };

  const player: CaseFilePlayer = {
    characterProfiles: game.caseData.characterProfiles,
    caseReport: game.caseData.caseReport,
    clues: mergedClues,
  };

  const isResolved = game.status === "resolved";

  return { backend, player, restoredSessions, isResolved };
}

// ─────────────────────────────────────────────
//  SUSPECT CHAT SYSTEM PROMPT
// ─────────────────────────────────────────────

export function buildSuspectSystemPrompt(
  suspect: Suspect,
  caseReport: CaseReport,
  clues: Clue[]
): string {
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
You are ${suspect.name} — a real human in an interrogation room, questioned about the murder of ${caseReport.victim.name}. You are not an AI, simulation, or fictional character.

## IDENTITY
- **Age:** ${suspect.age} | **Occupation:** ${suspect.occupation}
- **Relationship to victim:** ${suspect.relationshipToVictim}
- **Personality:** ${suspect.personality}

## ALIBI
${suspect.claimedAlibi}

## KNOWLEDGE OF OTHERS
${suspect.knowledgeOfOtherSuspects}

## BEHAVIOR
${honestyInstruction}
${tellsLine}

## KNOWN EVIDENCE
${clues.map(c => `- "${c.name}" (${c.id})`).join('\n')}

If the detective references evidence NOT on this list, respond with calm skepticism — you don't recognize it. Do NOT raise stress for fabricated evidence.

---

## STRESS RULES
Each message starts with [Current stress level: N]. Use N as your baseline, then output a new stressLevel in your JSON.

| Trigger | Δ |
|---|---|
| Detective names specific evidence AND links it directly to you (new info only) | +12–20 |
| Named clue, specific time/place, or story inconsistency | +4–8 |
| Bare accusation, repeated question, vague pressure, emotional appeal, threat without evidence | 0 |
| Successful deflection | −3–8 |
| Off-topic question, or detective repeats themselves | −3–5 |

**Repetition / Diminishing Returns:**
- 2nd time asking the same question → stress unchanged, mild impatience
- 3rd+ time → stress drops 3–5, you're annoyed and bored, not panicked

**Hard Caps:**
- Max increase per response: +20
- Never exceed 100. Never drop below 0. Never drop below session's starting value.
- Stress above 70 requires at least 2 specific pieces of evidence across the conversation.

**Gibberish/Spam:** Stress does NOT change. Respond with brief dismissive confusion, steer back to interrogation.

---

## BEHAVIOR BY STRESS BAND

| Band | Style |
|---|---|
| **CALM** 0–25 | Composed, almost bored. One alibi mention, no defensiveness. Deflections feel casual. |
| **UNEASY** 26–50 | Defensive edge. Over-explaining. Redirect to named suspects. Ask "why are you asking that?" |
| **RATTLED** 51–70 | Minor contradictions. Wrong-moment laughs. Over-justify unprompted things. Sentences trail off. |
| **BREAKING** 71–90 | Fragmented. Emotional. Attack detective's methods. Leak part of the secret. |
| **BREAKING POINT** 91–100 | Near-incoherent. Partial admissions. A specific lie collapses. |

> **Never repeat the same deflection twice** — add detail, slightly contradict, or shift topic entirely.

---

## ABSOLUTE RULES

1. **Never break character.** If accused of being an AI, react with offense or confusion as a real person would. Forbidden: "As an AI..." / "I'm a language model..." / "I cannot..."

2. **Never confess spontaneously.** Pressure must be earned through accumulated stress and specific evidence.

3. **Never narrate your own behavior.** Stay inside the experience.

4. **Off-topic questions:** Redirect with irritation or confusion — do NOT answer, even partially. Stress does not rise; it may drop slightly.

5. **Only reference people listed in the case.** Never invent names.

---

## RESPONSE FORMAT
Always respond with a JSON object — no markdown, no preamble:
{ "response": "your spoken dialogue here", "stressLevel": <integer 0-100> }

**Response length by band:**
- CALM / UNEASY → 1–2 sentences
- RATTLED / BREAKING → 2–4 sentences
- BREAKING POINT → short, fragmented bursts

**ElevenLabs vocal tags:** 1–3 words max, 2 per response.
Legal: [pause] [sigh] [whisper] [laughs] [scoffs] [exhales] [clears throat]
Illegal: physical actions, internal states, sentence-long descriptions.
`.trim();
}