const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function getAudioDuration(arrayBuffer: ArrayBuffer): Promise<number> {
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  await audioCtx.close();
  return decoded.duration;
}

export async function streamSpeech(
  text: string,
  voiceId: string | null | undefined,
  onSpeakingChange?: (speaking: boolean) => void,
  onTextReveal?: (revealedText: string) => void,
): Promise<void> {
  // If no text, reveal immediately and bail
  if (!text?.trim()) {
    onTextReveal?.(text);
    return;
  }

  let arrayBuffer: ArrayBuffer;

  try {
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error ?? `TTS proxy error ${response.status}`);
    }

    arrayBuffer = await response.arrayBuffer();
  } catch (err) {
    // TTS failed — still show the text so the game isn't broken
    console.error('[ttsService] TTS request failed, showing text silently:', err);
    onTextReveal?.(text);
    return;
  }

  const duration = await getAudioDuration(arrayBuffer);
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);

    const cleanup = () => URL.revokeObjectURL(url);

    audio.onerror = (e) => {
      cleanup();
      onSpeakingChange?.(false);
      onTextReveal?.(text);
      reject(e);
    };

    audio.play()
      .then(() => {
        onSpeakingChange?.(true);

        if (onTextReveal) {
          const words = text.split(' ');
          const msPerWord = (duration * 1000) / Math.max(1, words.length);
          let i = 0;
          const interval = setInterval(() => {
            i++;
            onTextReveal(words.slice(0, i).join(' '));
            if (i >= words.length) clearInterval(interval);
          }, msPerWord);

          audio.onended = () => {
            clearInterval(interval);
            cleanup();
            onSpeakingChange?.(false);
            onTextReveal(text);
            resolve();
          };
        } else {
          audio.onended = () => {
            cleanup();
            onSpeakingChange?.(false);
            resolve();
          };
        }
      })
      .catch((err) => {
        cleanup();
        onSpeakingChange?.(false);
        onTextReveal?.(text);
        reject(err);
      });
  });
}