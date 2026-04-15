import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY ?? "";
const ELEVENLABS_BASE    = "https://api.elevenlabs.io/v1";
const PREFERRED_MODELS   = ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_v2_5_flash"];

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

export interface ElevenVoice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  category: string | null;
  high_quality_base_model_ids: string[];
}

export interface VoiceSummary {
  voice_id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  description: string;
  use_case: string;
  category: string;
}

// ─────────────────────────────────────────────
//  PER-GAME STATE
// ─────────────────────────────────────────────

const usedVoiceIds = new Set<string>();

export function resetUsedVoices() {
  usedVoiceIds.clear();
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

export async function fetchVoices(): Promise<ElevenVoice[]> {
  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed: ${res.status}`);
  const data = (await res.json()) as { voices: ElevenVoice[] };

  const seen = new Set<string>();
  return (data.voices ?? [])
    .filter(v =>
      Array.isArray(v.high_quality_base_model_ids) &&
      v.high_quality_base_model_ids.some(m => PREFERRED_MODELS.includes(m))
    )
    .filter(v => {
      if (seen.has(v.voice_id)) return false;
      seen.add(v.voice_id);
      return true;
    });
}

export function summarizeVoice(v: ElevenVoice): VoiceSummary {
  return {
    voice_id:    v.voice_id,
    name:        v.name ?? "Unknown",
    gender:      v.labels?.gender      ?? "unknown",
    age:         v.labels?.age         ?? "unknown",
    accent:      v.labels?.accent      ?? "unknown",
    description: v.labels?.descriptive ?? "unknown",
    use_case:    v.labels?.use_case    ?? "unknown",
    category:    v.category            ?? "unknown",
  };
}

export function scoreVoice(
  v: VoiceSummary,
  ageCategory: string,
  accentHint: string | undefined,
  personality: string,
): number {
  let score = 0;

  const voiceAge = v.age.toLowerCase();
  if (voiceAge.includes(ageCategory) || ageCategory.includes(voiceAge)) score += 3;

  if (accentHint) {
    const hint = accentHint.toLowerCase();
    if (v.accent.toLowerCase().includes(hint) || hint.includes(v.accent.toLowerCase()))
      score += 4;
  }

  const personalityWords = personality.toLowerCase().split(/\W+/);
  const voiceDesc = `${v.description} ${v.use_case}`.toLowerCase();
  for (const word of personalityWords) {
    if (word.length > 3 && voiceDesc.includes(word)) score += 1;
  }

  if (v.category === "premade" || v.category === "professional") score += 2;

  return score;
}

// ─────────────────────────────────────────────
//  MCP SERVER
// ─────────────────────────────────────────────

export function createVoiceMcpServer(): McpServer {
  const server = new McpServer({
    name:    "elevenlabs-voice-selector",
    version: "2.0.0",
  });

  // ── Tool 1: List voices ──
  server.tool(
    "list_v3_voices",
    "Returns all ElevenLabs voices in your library, optionally filtered by gender.",
    {
      gender: z
        .enum(["male", "female", "any"])
        .optional()
        .default("any")
        .describe("Filter by gender. 'any' returns all voices."),
    },
    async ({ gender }) => {
      const voices    = await fetchVoices();
      const summaries = voices
        .map(summarizeVoice)
        .filter(v => gender === "any" ? true : v.gender.toLowerCase() === gender);

      if (summaries.length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ warning: `No ${gender} voices found.`, voices: [] }),
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ total: summaries.length, voices: summaries }, null, 2),
        }],
      };
    }
  );

  // ── Tool 2: Select best voice for a suspect ──
  server.tool(
    "select_v3_voice_for_suspect",
    "Given a suspect's characteristics, returns the best matching ElevenLabs voice_id from your library. Will never return a voice already used in this game session.",
    {
      name:                z.string(),
      gender:              z.enum(["male", "female"]),
      age:                 z.number(),
      personality:         z.string(),
      occupation:          z.string(),
      physicalDescription: z.string(),
      accentHint:          z.string().optional(),
    },
    async ({ name, gender, age, personality, occupation, physicalDescription, accentHint }) => {
      const voices     = await fetchVoices();
      const candidates = voices
        .map(summarizeVoice)
        .filter(v => v.gender.toLowerCase() === gender.toLowerCase())
        .filter(v => !usedVoiceIds.has(v.voice_id)); // exclude already-used voices

      if (candidates.length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `No unused ${gender} voices found in your ElevenLabs library.`,
              selected_voice_id: null,
            }),
          }],
        };
      }

      const ageCategory =
        age < 30 ? "young"
        : age < 50 ? "middle aged"
        : "old";

      const scored = candidates
        .map(v => ({ ...v, score: scoreVoice(v, ageCategory, accentHint, personality) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      usedVoiceIds.add(best.voice_id); // mark as used for this game session

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            selected_voice_id: best.voice_id,
            voice_name:        best.name,
            reason:
              `Best match for ${name} (${gender}, ~${ageCategory}` +
              `${accentHint ? `, ${accentHint} accent` : ""}): ` +
              `"${best.name}" — age="${best.age}", accent="${best.accent}", score=${best.score}`,
            top_5_candidates: scored.slice(0, 5).map(({ score, ...v }) => ({ ...v, score })),
          }, null, 2),
        }],
      };
    }
  );

  // ── Tool 3: Reset used voices (call at the start of each new game) ──
  server.tool(
    "reset_used_voices",
    "Clears the list of already-assigned voices. Call this at the start of each new game session so voices can be reused.",
    {},
    async () => {
      resetUsedVoices();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: "Voice assignments reset for new game." }),
        }],
      };
    }
  );

  return server;
}

// ─────────────────────────────────────────────
//  STDIO ENTRY POINT
// ─────────────────────────────────────────────

async function main() {
  const server    = createVoiceMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] ElevenLabs voice selector running on stdio");
}

const isMain =
  process.argv[1] &&
  (await import("url")).fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) main().catch(console.error);