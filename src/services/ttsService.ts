// ============================================================
//  TTS SERVICE — ElevenLabs
// ============================================================

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY ?? "";
const ELEVENLABS_BASE    = "https://api.elevenlabs.io/v1";

const FALLBACK_VOICES = {
  female: "cgSgspJ2msm6clMCkdW9",  // Jessica
  male:   "JBFqnCBsd6RMkjVDRZzb",  // George
};

/**
 * Generate and play TTS for a suspect's dialogue.
 * Audio tags ([pause], [sigh], etc.) are passed as-is.
 *
 * @param text    - Suspect dialogue, may contain ElevenLabs audio tags
 * @param voiceId - ElevenLabs voice_id from MCP selection, or null for fallback
 */
export async function streamSpeech(
  text:    string,
  voiceId: string | null | undefined,
): Promise<void> {
  // BUG FIX 1: was referencing undefined FALLBACK_VOICE_ID —
  // use FALLBACK_VOICES.female as the safe default instead
  const resolvedId = voiceId ?? FALLBACK_VOICES.female;

  if (!resolvedId) {
    console.warn("[tts] No voice ID available — skipping TTS");
    return;
  }

  // BUG FIX 2: was referencing undefined ELEVEN_LABS_API_KEY —
  // use ELEVENLABS_API_KEY (matches the const declared above)
  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${resolvedId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key":   ELEVENLABS_API_KEY,
        Accept:         "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability:         0.5,
          similarity_boost:  0.8,
          use_speaker_boost: true,
        },
        optimize_streaming_latency: 4,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail?.message ?? "ElevenLabs TTS failed");
  }

  return playStream(response);
}

// ── Reliable MediaSource queue ────────────────────────────────
function playStream(response: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const mediaSource = new MediaSource();
    const audio = new Audio(URL.createObjectURL(mediaSource));

    mediaSource.addEventListener("sourceopen", async () => {
      let sourceBuffer: SourceBuffer;

      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      } catch (e) {
        return reject(e);
      }

      const queue: Uint8Array<ArrayBuffer>[] = [];
      let appending  = false;
      let streamDone = false;

      const flush = () => {
        if (appending || !queue.length) return;
        if (sourceBuffer.updating) return;
        appending = true;
        try {
          sourceBuffer.appendBuffer(queue.shift()!);
        } catch (e) {
          reject(e);
        }
      };

      sourceBuffer.addEventListener("updateend", () => {
        appending = false;
        if (queue.length) {
          flush();
        } else if (streamDone) {
          try { mediaSource.endOfStream(); } catch { /* already closed */ }
          resolve();
        }
      });

      sourceBuffer.addEventListener("error", (e) => reject(e));

      const reader = response.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamDone = true;
            if (!appending && !queue.length) {
              try { mediaSource.endOfStream(); } catch { /* already closed */ }
              resolve();
            }
            break;
          }
          queue.push(value);
          flush();
        }
      } catch (e) {
        reject(e);
      }
    }, { once: true });

    audio.play().catch(reject);
  });
}