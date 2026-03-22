import { useEffect, useRef, useState, useCallback } from 'react';
import './LoadingScreen.css';

const AUDIO_SRC = '/assets/dejcomin-electronic-ambient-music-chill-mix-downtempo-background-dejcoart-430828.mp3';

export default function LoadingScreen() {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoSpinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const rotationRef = useRef(0); // live ref to avoid stale closure in handlers

  // Sync rotation state → ref
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);

  // Init audio
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;
    audio.play().catch(() => {/* autoplay blocked – user interaction will start it */});
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Auto-spin (only when not dragging)
  useEffect(() => {
    if (isDragging) {
      if (autoSpinRef.current) clearInterval(autoSpinRef.current);
      return;
    }
    autoSpinRef.current = setInterval(() => {
      setRotation(prev => (prev + 6) % 360);
    }, 30);
    return () => { if (autoSpinRef.current) clearInterval(autoSpinRef.current); };
  }, [isDragging]);

  // Compute angle (degrees) of pointer relative to element center
  const getAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const spinnerRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastAngleRef.current = getAngle(e, spinnerRef.current!);

    // Resume audio on first interaction (handles autoplay block)
    audioRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !spinnerRef.current) return;
      const angle = getAngle(e, spinnerRef.current);
      const prev = lastAngleRef.current ?? angle;
      let delta = angle - prev;
      // Wrap delta to [-180, 180]
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngleRef.current = angle;

      setRotation(r => (r + delta + 360) % 360);

      // Scrub audio based on rotation speed
      const audio = audioRef.current;
      if (audio && audio.duration) {
        // Map drag speed (delta deg/frame) → playback rate
        // delta > 0 = forward spin, delta < 0 = rewind
        // Clamp so it never goes completely silent or breaks
        const speed = delta / 6; // normalise: 6 deg/frame = 1× (matches auto-spin)
        const newRate = Math.min(3, Math.max(-1, speed));
        audio.playbackRate = Math.abs(newRate) < 0.05 ? 0.05 : Math.abs(newRate);

        // Scrub time: negative speed = rewind, positive = fast-forward
        const scrub = (newRate / Math.abs(newRate || 1)) * Math.abs(delta) * 0.05;
        audio.currentTime = Math.min(
          audio.duration - 0.05,
          Math.max(0, audio.currentTime + scrub)
        );
      }
    };

    const onUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      lastAngleRef.current = null;
      // Restore normal playback rate
      if (audioRef.current) audioRef.current.playbackRate = 1;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging]);

  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div
          ref={spinnerRef}
          className={`loading-spinner${isDragging ? ' dragging' : ''}`}
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <img
            src="https://static.vecteezy.com/system/resources/previews/036/397/995/large_2x/ai-generated-otter-isolated-on-transparent-background-png.png"
            alt="Loading"
            draggable={false}
            style={{
              width: '150px',
              height: '150px',
              transform: `rotate(${rotation}deg)`,
              filter: `drop-shadow(0 0 20px rgba(0,0,0,0.3))`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
        <h2 className="loading-text">Building your case...</h2>
        <p className="loading-subtext">
          {isDragging ? '🎛️ Scratching the record...' : 'Generating suspects and clues'}
        </p>
      </div>
    </div>
  );
}