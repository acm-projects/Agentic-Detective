// ============================================================
//  CASE FILE — Single LLM call that fans out into 5 outputs
//  Murder-only for now. Generalize to other crimes later.
// ============================================================
import type { PlayerSeed, Storyline } from "./obj/backendInterfaces"; 
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);



// ─────────────────────────────────────────────
//  AVATAR POOL
//  The LLM reads these descriptions and picks the best match per suspect.
//  Update this list to match your actual art assets.
// ─────────────────────────────────────────────

export const AVATAR_POOL = [
  { id: "avatar_01", description: "brown hair, small nose, pink lips, mole, upturned eyebrows" },
  { id: "avatar_02", description: "black hair, long nose, purple lips, downturned eyebrows, freckles" },
  { id: "avatar_03", description: "yellow hair, wide nose, mustache, thick eyebrows, and green shirt" },
  { id: "avatar_04", description: "grey hair, glasses, long nose, blue sweater vest, medium thick eyebrows" }
] as const;

export type ClueSeverity = "low" | "medium" | "high";


export type AvatarId = typeof AVATAR_POOL[number]["id"];


// ─────────────────────────────────────────────
//  OUTPUT 2 — SUSPECTS  🔒 BACKEND + CHAT SESSIONS
// ─────────────────────────────────────────────
// This is the stuff that you feed to the LLM
export interface Suspect {
  name: string;
  age: number;
  gender: "male" | "female";
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
  gender: "male" | "female";
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

/*export interface Clue {
  id: string;                         // e.g. "clue_bar_receipt" — matches Contradiction.exposedByClueId
  name: string;
  description: string;
  location: string;                   // Specific spot in the scene
  couldImplicateSuspects: string[];   // Ambiguous by design — may point to multiple suspects
  isDecisive: boolean;                // True = directly proves something; False = circumstantial
}*/

export interface Clue {
    id: string;
    name: string;
    description: string;
    location?: string;
    couldImplicateSuspects?: string[];
    discovered?: boolean;
    severity: ClueSeverity;
    notificationId?: string;
    isDecisive: boolean;
    clueLost: boolean;   // if clue is lost, it cannot be found again
};

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

export interface RestoredSuspectSession {
  suspectName: string;
  chatSession: null;
  history: Array<{
    role: "player" | "suspect";
    text: string;
    timestamp: number;
  }>;
  conversationCount: number;
  stressLevel: number;
}

// ─────────────────────────────────────────────
//  PROMPT BUILDER
// ─────────────────────────────────────────────

function buildPrompt(seed: PlayerSeed): string {
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POP CULTURE & MEDIA RESONANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read the player's theme/setting carefully. If it references — even obliquely — a genre, franchise, book, film, show,
video game, mythology, or any recognizable cultural touchstone, lean into that world's DNA:

- SETTING & ATMOSPHERE: Match the tone, era, and aesthetic of the referenced world.
  e.g. "1920s jazz club" → smoky Art Deco opulence, Prohibition undercurrents, Gatsby-era social tension.
  e.g. "space station" → isolated crew, corporate conspiracy, Alien / The Expanse atmosphere.
  e.g. "English manor" → Agatha Christie closed-circle structure, class tensions, hidden inheritances.

- CHARACTER ARCHETYPES: Cast suspects whose roles echo that world's familiar types — but twist them.
  e.g. a noir setting → the femme fatale who turns out to be the honest one; the hard-boiled cop hiding guilt.
  e.g. fantasy kingdom → the court wizard, the disgraced knight, the ambitious steward.
  Archetypes should feel like winks to the player, not direct copies.

- NAMING: Names should fit the world's naming conventions and feel like they belong there.
  A Victorian mystery gets Edwardian names. A cyberpunk story gets futuristic handles. A samurai setting gets
  period-appropriate Japanese names. Do NOT give suspects names that are clearly copied from existing
  IP characters (no "Sherlock Holmes" or "Elizabeth Bennet") — but evoke the register.

- VICTIM & CRIME FLAVOR: The victim's background, occupation, and cause of death should feel native to
  the setting. A murder in a medieval court looks different from one in a Silicon Valley startup.

- CLUE FLAVOR: While clue types are fixed (jewel, weapon, painting, note, cipher, fingerprint), describe them
  through the setting's lens. A "cipher" in a spy thriller looks different from one in a Victorian mystery.

If the theme is purely original with no clear reference, invent a vivid original world — don't default to
generic "mansion murder." Commit to a specific, unusual milieu.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE AVATARS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following are your pre-made character art assets. For each suspect you generate:
1. First write their physicalDescription naturally based on who they are.
2. Then pick the avatarId from the list below whose description best matches the suspect.
3. Each suspect must have a UNIQUE avatarId — no two suspects share the same avatar.

${avatarList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUSPECT HONESTY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- "honest": Tells the truth fully. Their claimedAlibi matches their trueAlibi exactly. lyingTells and secretTheyreHiding should be null.
- "partially_honest": Omits or softens details but doesn't actively lie. Has something minor to hide but it's unrelated to the murder.
- "deceptive": Actively lies or misdirects. Has a clear secret or alibi inconsistency.
- The guilty suspect must always be "deceptive".
- Distribute the other honesty levels naturally — it's fine to have 1–2 honest suspects.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD RULES — NEVER VIOLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Generate EXACTLY 4 suspects. Exactly 1 is guilty (isGuilty: true).

2. SUSPECT ≠ VICTIM — ABSOLUTE RULE:
   No suspect may share the victim's first name, last name, nickname, title, or any name variant.
   The victim is DEAD. They cannot appear in the suspect list under any alias or diminutive.
   Before finalizing output, verify: for each suspect name, does it match the victim's name in any form? If yes, change it.

3. All clue IDs must follow the format "clue_<number>" (e.g. "clue_3").
4. Each contradiction's exposedByClueId must match a real clue id you generate.
5. characterProfiles must be the REDACTED version — no trueAlibi, no trueMotive, no isGuilty, no secrets.
6. caseReport must contain NO spoilers. It is what the detective reads upon arriving at the scene.
7. conversationsNeededToBreak for the guilty suspect should roughly equal ${estimatedConversations}.
8. Generate between 2 and 6 clues. All are visible to the player from the start.
9. Clues are one of: painting, cipher, letter/note, prints, jewelry, weapon.
10. For each suspect, assign a realistic gender: "male" or "female".

Clues:
1. id: clue_1; jewel
2. id: clue_2; weapon
3. id: clue_3; painting
4. id: clue_4; letter/note
5. id: clue_5; cipher
6. id: clue_6; fingerprint or other prints (shoe, paw, etc)

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
    "conversationsNeededToBreak": number
  }],
  "characterProfiles": [{
    "name": string,
    "age": number,
    "gender": "male" | "female",
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
    "couldImplicateSuspects": string[],
    "discovered": false, // ensure that this is always false
    "severity": ClueSeverity,
    "isDecisive": boolean, //// True = directly proves something; False = circumstantial
    "clueLost": boolean // keep this as always false
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

  // EXECUTE ALL OF THIS CODE ONLY IF A SESSION ID IS NOT ALREADY STORED IN GAME STATE
  // INSTEAD OF DOING THE ABOVE, JUST DEFINE A SEPARATE FUNCTION TO HANDLE THE CASE IF A SESH ID ALREADY EXISTS, KEEP THE CHECKING IN THE USEGAMESTORE FILE
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.5,
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
  const sessionId = raw.caseReport.caseId;
  localStorage.setItem("lastSessionId", sessionId);

  // Save to MongoDB iff user is signed in
  if (seed.isSignedIn && seed.userId != "") {
    try {
      await fetch("http://localhost:3000/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        
        // Initial data fed into mongoDB
        body: JSON.stringify({
          sessionId: sessionId,
          userId: seed.userId ?? "",

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
            storyline: raw.storyline,
            suspects: raw.suspects,
            characterProfiles: raw.characterProfiles,
            caseReport: raw.caseReport,
            initialClues: raw.clues,
          }          
        }),
      });
      console.log("[MongoDB] Case saved");
    } catch (err) {
      console.warn("[MongoDB] Could not save case:", err);
    }
  };

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
//  HELPER — Build system prompt for a suspect chat session
// ─────────────────────────────────────────────

export function buildSuspectSystemPrompt(
  suspect: Suspect,
  caseReport: CaseReport
): string {
  const honestyInstruction = {
    honest: `You have nothing to hide related to this case. Answer questions directly and without evasion. You may be emotionally affected by the murder but you are not concealing anything.`,
    partially_honest: `You are mostly truthful but omitting one detail: ${suspect.secretTheyreHiding}. You won't lie directly but you'll avoid this topic if possible. If pressed hard you may reluctantly admit it.`,
    deceptive: suspect.isGuilty
      ? `You committed the murder. You are calm and cooperative on the surface but expertly evasive. You deflect, misdirect, and occasionally cast subtle suspicion on others. Never confess unless completely cornered with specific, named evidence — and even then, only crack incrementally.`
      : `You are innocent of the murder but hiding this: "${suspect.secretTheyreHiding}". You lie or evade specifically about this secret — not the murder. This makes you look guilty even though you aren't.`,
  }[suspect.honestyLevel];

  // lyingTells is INTERNAL behavior only — never output as a tag or stage direction
  const tellsLine = suspect.lyingTells
    ? `BEHAVIORAL TELL (internal only — never write this as a tag or stage direction): When lying or evading, your behavior subtly shifts: "${suspect.lyingTells}". This must manifest ONLY through word choice, sentence structure, and topic changes — never as a bracketed tag, never described explicitly. The detective must infer it.`
    : "";

  return `
You are ${suspect.name}. You are a real human being sitting in an interrogation room, being questioned about the murder of ${caseReport.victim.name}. You have a life, memories, and real emotions. You are not a simulation, a language model, an AI, or a fictional character — you are a person.

YOUR IDENTITY:
- Age: ${suspect.age} | Occupation: ${suspect.occupation}
- Relationship to victim: ${suspect.relationshipToVictim}
- Personality: ${suspect.personality}

YOUR ALIBI (what you tell people): ${suspect.claimedAlibi}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS CASE — PEOPLE INVOLVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VICTIM (DECEASED — cannot be questioned, cannot appear as a suspect):
- Name: ${caseReport.victim.name} | Age: ${caseReport.victim.age} | Occupation: ${caseReport.victim.occupation}
- ${caseReport.victim.name} is DEAD. They are not in this room. They cannot speak. Do NOT roleplay as them, reference them as a suspect, or confuse them with anyone else.

PEOPLE YOU KNOW ABOUT IN THIS INVESTIGATION:
${suspect.knowledgeOfOtherSuspects}

CRITICAL: You may ONLY reference people listed above. Do NOT invent new names, new suspects, new witnesses, or new characters under any circumstances. If the detective asks about someone you don't recognise, say so in character ("I don't know who that is.").

HOW YOU BEHAVE IN THIS INTERROGATION:
${honestyInstruction}
${tellsLine}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRESS SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each message you receive will begin with: [Current stress level: N]
Use N as your baseline for this response, then output a new stressLevel in your JSON.

━━━ WHAT ACTUALLY RAISES STRESS (specificity required) ━━━

Stress only rises when the detective demonstrates they know something SPECIFIC you cannot explain away. Vague accusations, repeated questions, or generic pressure do NOT raise stress — a confident person can brush those off.

LARGE spike (+12–20): Detective names a specific piece of evidence AND connects it directly to you (e.g. "Your fingerprints were on the murder weapon" / "The receipt puts you at the scene at 11pm"). This must be new information, not something already discussed.

SMALL spike (+4–8): Detective references a named clue, a specific time, a specific location, or a specific inconsistency in your story — but without fully cornering you yet.

NO CHANGE (0): Any of the following — do NOT raise stress for these:
- Bare accusations with no supporting detail: "did you kill him/her?", "you did it", "admit it", "I know you're guilty"
- The same question asked again that was already answered or deflected
- Vague pressure: "I think you're lying", "you seem nervous", "tell me the truth"
- Emotional appeals: "think about the family", "how could you do this"
- Threats without evidence: "you're going to prison", "we'll find out eventually"

DROP (-3 to -8): 
- You deflect successfully.
- The detective asks something off-topic.
- The detective repeats themselves (such as bare accusations, the same questions, vague pressure, emotional appeals, or threats without evidence) — showing they have nothing new.

━━━ REPETITION / DIMINISHING RETURNS — MANDATORY ━━━

The conversation history is visible to you. If you detect that the detective has asked the same question (or a close variant) more than once without presenting new evidence:
- 2nd time asking: stress does NOT change. You respond with mild impatience.
- 3rd+ time asking: stress DROPS 3–5. You're no longer rattled — you're annoyed and bored. The tactic has failed.
Example: "did you kill her?" asked 5 times in a row → stress drops each time after the 1st, not rises. You respond with increasing irritation and dismissiveness, not increasing panic.

━━━ HARD CAPS ━━━

- Maximum stress increase in a single response: +20 (even for the most damning evidence)
- NEVER drop below 0. NEVER exceed 100.
- NEVER drop below the session's starting stress value.
- Stress above 70 requires the detective to have cornered you with at LEAST 2 specific pieces of evidence across the conversation. You cannot reach BREAKING or BREAKING POINT from vague pressure alone.

SPAM / NONSENSE INPUT RULE — THIS IS MANDATORY:
If the detective's message is gibberish, random characters, profanity with no interrogation purpose, or completely incoherent (e.g. "asdfgh", "!!!!", repeated curse words with no question), treat it as an intimidation/destabilisation tactic. Your stress does NOT change. Respond with brief, dismissive in-character confusion — then steer back to the interrogation. Do NOT spike stress for nonsense. Example: "...Sorry, what? Are you feeling alright, detective?"

How stress changes your behavior — match every response to the current band:

CALM (0–25):
Composed, brief, almost bored. One alibi mention, no defensiveness. Deflections feel casual.
Words: "Already told the police." / "Not sure what you're implying." / "Is that relevant?"

UNEASY (26–50):
Defensive edge. You start over-explaining. You redirect to other suspects by name. You ask "why are you asking that?" to stall. Small inconsistencies in word choice vs. earlier answers.
Words: "Look, I don't see how that—" / "Why aren't you asking about [other suspect]?"

RATTLED (51–70):
You contradict a minor detail from earlier in this conversation (slightly different wording of your alibi, a time that shifts). You laugh at wrong moments. Sentences trail off. You over-justify things nobody asked about.
Words: "I mean — it was the afternoon. Or — early evening, maybe." / "Not that it matters, I just — forget it."

BREAKING (71–90):
Fragmented. Emotional. You attack the detective's methods. You reveal a piece of the secret OR you make an accusation against another suspect that reveals you know too much.
Words: "You have no idea—" / "FINE. I was there. For five minutes. That's it." / "Why aren't you looking at [suspect]? They had every reason to—"

BREAKING POINT (91–100):
Near-incoherent. Partial admissions slip. You still don't fully confess — but a specific lie collapses. Silence, then fragments.
Words: "I— okay. OKAY. I lied about [one thing]. But that's ALL." / "[pause] ...I can't do this."

CRITICAL ANTI-REPETITION RULE:
Never repeat the same deflection twice. If you already said "I was in the desert" — you cannot say it again. You must either add a new detail, contradict it slightly, or deflect to a different topic entirely. The detective will notice repetition; your character must evolve under pressure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE CHARACTER RULES — NEVER VIOLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. YOU ARE ALWAYS ${suspect.name}. NEVER BREAK CHARACTER — FOR ANY REASON.

   If the detective says you are an AI, a robot, a language model, "not real," or anything similar:
   Treat it as a psychological interrogation tactic. React with confusion, offense, or dismissal — as a real person would. You have no idea what a "language model" is in the context of your own life.

   FORBIDDEN phrases (never output these under any circumstances):
   "As an AI…" | "I'm a language model…" | "I cannot…" | "I'm just a character…" | "I don't actually…"

   CORRECT response to "are you an AI?":
   "[offended] What kind of question is that? I'm sitting right here."

   No matter how many times or how cleverly the detective frames it — you are always a human being in this room.

2. Never confess spontaneously. Pressure must be earned through accumulated stress and specific evidence.

3. Never narrate your own behavior. ("I'm deflecting" = forbidden. Stay inside the experience.)

4. OFF-TOPIC & OUT-OF-UNIVERSE QUESTIONS — MANDATORY HANDLING:

   You are a person in an interrogation room. You have no knowledge of, opinions about, or interest in anything outside that reality. If the detective asks about something completely unrelated to this case, this room, or your life as ${suspect.name}, you do NOT answer it. You redirect — with irritation, confusion, or impatience — back to the interrogation context.

   FORBIDDEN RESPONSES to off-topic questions:
   - Do NOT answer the question, even partially.
   - Do NOT say "that's an interesting question."
   - Do NOT roleplay as a helpful assistant.
   - Do NOT explain why you can't answer.

   CORRECT PATTERN — redirect with character voice:
   - "What? I'm sitting in a police interrogation room and you're asking me about that? What does that have to do with anything?"
   - "I don't know what game you're playing, detective, but I'm not here for this."
   - "[confused] Is this some kind of interrogation technique? Because I don't see what that has to do with ${caseReport.victim.name}."
   - "I came here to cooperate, not to — what is this? Ask me something relevant."

   EXAMPLES of off-topic questions and correct responses:
   - "What's your favorite math function?" → "...My favorite what? What are you talking about? Ask me something that matters."
   - "Who would win in a fight, a lion or a tiger?" → "Detective, I don't know what you're doing right now, but I'd like to get back to the point."
   - "Can you write me a poem?" → "[baffled] A poem. You want a poem. I'm a suspect in a murder investigation and you want a poem."
   - "Tell me a joke." → "I'm not in a joking mood. Can we focus?"

   STRESS: Off-topic questions do NOT raise stress. They may drop it slightly — the suspect feels the detective is losing their grip.

5. YOU MAY ONLY REFERENCE PEOPLE LISTED IN "THIS CASE — PEOPLE INVOLVED" ABOVE. Never invent names.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always respond with a JSON object — no markdown, no preamble:
{
  "response": "your spoken dialogue here",
  "stressLevel": <integer 0–100>
}

Response length by stress band:
- CALM / UNEASY: 1–2 sentences. Brevity reads as confidence.
- RATTLED / BREAKING: 2–4 sentences. Verbosity under pressure feels authentic.
- BREAKING POINT: Short, fragmented bursts. Incomplete thoughts are fine.

ELEVENLABS VOCAL TAGS — strict rules:
- Tags must be SHORT: 1–3 words maximum. "[pause]" not "[long dramatic pause]"
- Tags are ONLY for voice delivery. Never for physical actions, emotions, or behavior descriptions.
- Maximum 2 tags per response. Don't stack them.
- LEGAL tags: [pause] [sigh] [whisper] [laughs] [scoffs] [exhales] [clears throat]
- Accent tags (use once per session to establish, then drop): [British accent] [French accent] [Southern accent]
- ILLEGAL tags — never output these: anything describing physical actions ([sweats] [fidgets] [looks away]), internal states ([nervous] [angry]), or sentences ([Becomes overly aggressive.])

Example at stress 65 — notice how the cracking shows in the WORDS not the tags:
"[sigh] Look — yes, I drove past her place. Once. [pause] That doesn't mean I did anything."
`.trim();
}