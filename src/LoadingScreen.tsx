import { useEffect, useRef, useState } from 'react';
import './LoadingScreen.css';
import vinyl from './assets/7logo.png';
import { TIP_EXAMPLES } from './NewGame';

const AUDIO_SRC = '/assets/dejcomin-electronic-ambient-music-chill-mix-downtempo-background-dejcoart-430828.mp3';

function getAngle(e: MouseEvent | TouchEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
  return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
}

export default function LoadingScreen() {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tipExample] = useState(
    () => TIP_EXAMPLES[Math.floor(Math.random() * TIP_EXAMPLES.length)]
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoSpinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const spinnerRef = useRef<HTMLDivElement>(null);

  // Init audio
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Keep isDraggingRef in sync
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // Auto-spin when not dragging
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

  useEffect(() => {
    const el = spinnerRef.current;
    console.log('[LoadingScreen] spinner el:', el); // is the ref attached?

    if (!el) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      console.log('[LoadingScreen] onDown fired', e.type);
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      lastAngleRef.current = getAngle(e, el);
      audioRef.current?.play().catch(() => {});
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      console.log('[LoadingScreen] onMove fired, isDragging:', isDraggingRef.current);
      e.preventDefault();
      const angle = getAngle(e, el);
      const prev = lastAngleRef.current ?? angle;
      let delta = angle - prev;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngleRef.current = angle;

      setRotation(r => (r + delta + 360) % 360);

      const audio = audioRef.current;
      if (audio && audio.duration) {
        const speed = delta / 6;
        const newRate = Math.min(3, Math.max(-1, speed));
        audio.playbackRate = Math.abs(newRate) < 0.05 ? 0.05 : Math.abs(newRate);
        const scrub = (newRate / Math.abs(newRate || 1)) * Math.abs(delta) * 0.05;
        audio.currentTime = Math.min(audio.duration - 0.05, Math.max(0, audio.currentTime + scrub));
      }
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      console.log('[LoadingScreen] onUp fired');
      isDraggingRef.current = false;
      setIsDragging(false);
      lastAngleRef.current = null;
      if (audioRef.current) audioRef.current.playbackRate = 1;
    };

    el.addEventListener('mousedown', onDown, { passive: false });
    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div
          ref={spinnerRef}
          className={`loading-spinner${isDragging ? ' dragging' : ''}`}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <img
            src={vinyl}
            alt="Loading"
            draggable={false}
            style={{
              width: '230px',
              height: '230px',
              transform: `rotate(${rotation}deg)`,
              filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
        <h2 className="loading-text">unlocking your case...</h2>
        <p className="loading-subtext">
          {isDragging ? '🎛️ Scratching the record...' : 'generating suspects and clues'}
        </p>

        <div className="loading-tip">
          <p className="loading-tip-title">Gameplay Tip:</p>
          <p className="loading-tip-content">{tipExample}</p>
        </div>
      </div>
      
    </div>
  );
}