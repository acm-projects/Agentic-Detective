// Text-to-Speech Service using Eleven Labs API
// Converts suspect responses to audio and plays them

const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
const GIRL_VOICE_ID = import.meta.env.VITE_GIRL_VOICE_ID; // Default voice ID - you can customize this per suspect
const BOY_VOICE_ID = import.meta.env.VITE_BOY_VOICE_ID; // Another voice option

/**
 * Convert text to speech using Eleven Labs API
 * @param text - The text to convert to speech
 * @param gender - Gender of the speaker ("male" or "female") to select appropriate voice
 * @returns Promise with audio URL or error
 */

/*
export async function generateSpeech(text: string, gender: "male" | "female" = "female"): Promise<TTSResponse> {
  const voiceId = gender === "male" ? BOY_VOICE_ID : GIRL_VOICE_ID;
  if (!ELEVEN_LABS_API_KEY) {
    console.error("VITE_ELEVEN_LABS_API_KEY is not defined. Add it to your .env.local file");
    return { audioUrl: null, error: "Eleven Labs API key not configured" };
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2_5", // Fast model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Eleven Labs API Error:", error);
      return { audioUrl: null, error: `API Error: ${error.detail?.message || "Unknown error"}` };
    }

    // Convert response to blob and create object URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { audioUrl, error: null };
  } catch (err) {
    console.error("TTS Error:", err);
    return { audioUrl: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
*/
/**
 * Play audio from URL
 * @param audioUrl - The URL of the audio to play
 * @returns Promise that resolves when audio finishes or errors
 */
/*
export async function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl); // Clean up
      resolve();
    };
    audio.onerror = () => {
      reject(new Error("Failed to play audio"));
    };
    audio.play().catch(reject);
  });
}
*/
/**
 * Generate speech from text and play it immediately
 * @param text - The text to convert and play
 * @param gender - Gender of the speaker ("male" or "female")
 */

export async function generateAndPlaySpeech(text: string, gender: "male" | "female" = "female"): Promise<void> {
  await streamSpeech(text, gender);
}


export async function streamSpeech(text: string, gender: "male" | "female" = "female") {
  const voiceId = gender === "male" ? BOY_VOICE_ID : GIRL_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        speed: 2,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("TTS API Error:", response.status, err);
    return;
  }

  // Safari and some browsers don't support audio/mpeg in MediaSource — fall back to blob
  const canStreamMpeg =
    typeof MediaSource !== "undefined" &&
    MediaSource.isTypeSupported("audio/mpeg");

  if (!canStreamMpeg) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(e => console.error("TTS play error:", e));
    return;
  }

  const mediaSource = new MediaSource();
  const audio = new Audio(URL.createObjectURL(mediaSource));

  mediaSource.addEventListener("sourceopen", async () => {
    let sourceBuffer: SourceBuffer;
    try {
      sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
    } catch (e) {
      console.error("MediaSource addSourceBuffer failed:", e);
      mediaSource.endOfStream();
      return;
    }

    const reader = response.body!.getReader();

    async function push() {
      const { done, value } = await reader.read();

      if (done) {
        mediaSource.endOfStream();
        return;
      }

      sourceBuffer.appendBuffer(value);
      sourceBuffer.addEventListener("updateend", push, { once: true });
    }

    push();
  });

  audio.play().catch(e => console.error("TTS play error:", e));
}
