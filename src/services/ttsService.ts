const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY ?? "";
const ELEVENLABS_BASE    = "https://api.elevenlabs.io/v1";

const FALLBACK_VOICES = {
  female: "cgSgspJ2msm6clMCkdW9",
  male:   "JBFqnCBsd6RMkjVDRZzb",
};

export async function streamSpeech(
  text: string,
  voiceId: string | null | undefined,
  onSpeakingChange?: (speaking: boolean) => void,
): Promise<void> {
  const resolvedId = voiceId?.trim() || FALLBACK_VOICES.female;
  if (!ELEVENLABS_API_KEY) return;

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${resolvedId}/stream`, // keep /stream
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key":   ELEVENLABS_API_KEY,
        Accept:         "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5", // keep flash if quality is acceptable
        voice_settings: {
          stability:         0.5,
          similarity_boost:  0.8,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail?.message ?? "ElevenLabs TTS failed");
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onSpeakingChange?.(false); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); onSpeakingChange?.(false); reject(e); };
    audio.play()
      .then(() => onSpeakingChange?.(true))
      .catch(reject);
  });
}