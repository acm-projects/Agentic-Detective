import { useState, useRef, useCallback, useEffect } from 'react';

const SPEECH_TO_TEXT_URL = 'http://localhost:3000/api/speech-to-text';

function getRecordingMimeType(): string | undefined {
  if (!window.MediaRecorder?.isTypeSupported) return undefined;

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return candidates.find(type => MediaRecorder.isTypeSupported(type));
}

function getFriendlyTranscriptionError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not transcribe voice input. Please try again.';
}

async function transcribeAudio(blob: Blob): Promise<string> {
  const response = await fetch(SPEECH_TO_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
    },
    body: blob,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error ?? 'ElevenLabs speech transcription failed.');
  }

  return String(data?.text ?? '').trim();
}

export function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSupported] = useState(() => (
    Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined'
  ));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const cleanupRecorder = useCallback(() => {
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
  }, [stopTracks]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      setIsListening(false);
      cleanupRecorder();
      return;
    }

    recorder.stop();
  }, [cleanupRecorder]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }

      cleanupRecorder();
    };
  }, [cleanupRecorder]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }

    if (isListening || isTranscribing) return;

    setSpeechError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setSpeechError('Could not record microphone audio. Please try again.');
        setIsListening(false);
        setIsTranscribing(false);
        cleanupRecorder();
      };

      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: recordedType });

        setIsListening(false);
        stopTracks();

        if (!audioBlob.size) {
          setSpeechError('No microphone audio was recorded. Please try again.');
          cleanupRecorder();
          return;
        }

        setIsTranscribing(true);

        try {
          const transcript = await transcribeAudio(audioBlob);

          if (transcript) {
            onResultRef.current(transcript);
            setSpeechError(null);
          } else {
            setSpeechError('No speech detected. Try speaking closer to the microphone.');
          }
        } catch (error) {
          setSpeechError(getFriendlyTranscriptionError(error));
        } finally {
          setIsTranscribing(false);
          cleanupRecorder();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      setSpeechError('Microphone permission is required for voice input.');
      setIsListening(false);
      setIsTranscribing(false);
      cleanupRecorder();
    }
  }, [cleanupRecorder, isListening, isSupported, isTranscribing, stopTracks]);

  const toggle = useCallback(async () => {
    if (isListening) {
      stop();
      return;
    }

    await start();
  }, [isListening, start, stop]);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  return {
    isListening,
    isSupported,
    isTranscribing,
    speechError,
    clearSpeechError,
    toggle,
  };
}
