const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY ?? "";
const ELEVENLABS_BASE    = "https://api.elevenlabs.io/v1";

const FALLBACK_VOICES = {
  female: "cgSgspJ2msm6clMCkdW9",
  male:   "JBFqnCBsd6RMkjVDRZzb",
};

async function getAudioDuration(arrayBuffer: ArrayBuffer): Promise<number> {
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  await audioCtx.close();
  return decoded.duration; // in seconds
}

export async function streamSpeech(
  text: string,
  voiceId: string | null | undefined,
  onSpeakingChange?: (speaking: boolean) => void,
  onTextReveal?: (revealedText: string) => void,  // ← add this
): Promise<void> {
  const resolvedId = voiceId?.trim() || FALLBACK_VOICES.female;
  if (!ELEVENLABS_API_KEY) {
    onTextReveal?.(text); // fallback: show all at once
    return;
  }

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${resolvedId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
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
  const duration = await getAudioDuration(arrayBuffer);
  const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      onSpeakingChange?.(false);
      onTextReveal?.(text); // ensure full text is shown at end
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      onSpeakingChange?.(false);
      onTextReveal?.(text);
      reject(e);
    };

    audio.play()
      .then(() => {
        onSpeakingChange?.(true);

        // Drip words out over the audio duration
        if (onTextReveal) {
          const words = text.split(' ');
          const msPerWord = (duration * 1000) / words.length;
          let i = 0;
          const interval = setInterval(() => {
            i++;
            onTextReveal(words.slice(0, i).join(' '));
            if (i >= words.length) clearInterval(interval);
          }, msPerWord);

          // Safety: clear interval if audio ends early
          audio.onended = () => {
            clearInterval(interval);
            URL.revokeObjectURL(url);
            onSpeakingChange?.(false);
            onTextReveal(text);
            resolve();
          };
        }
      })
      .catch(reject);
  });
}