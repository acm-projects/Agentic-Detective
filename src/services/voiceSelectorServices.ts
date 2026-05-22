// ============================================================
//  VOICE SELECTOR SERVICE — browser-safe
//  Calls the Express /select-voices endpoint which handles
//  all MCP/Node.js work server-side.
// ============================================================

import type { Suspect } from '../caseFile';

const SERVER = import.meta.env.VITE_API_BASE_URL;

export interface VoiceSelection {
  voiceId: string;
}

/**
 * Calls the backend to select v3 ElevenLabs voices for all suspects.
 * Returns a map of suspectName → voice_id.
 */
export async function selectVoicesForCase(
  suspects: Suspect[],
  settingHint?: string
): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${SERVER}/select-voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspects, settingHint }),
    });

    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data = await res.json() as { voiceIds: Record<string, string> };
    return data.voiceIds;
  } catch (err) {
    console.error('[voiceSelector] Failed, voices will be silent:', err);
    // Return empty map — ttsService will fall back to default voices
    return {};
  }
}