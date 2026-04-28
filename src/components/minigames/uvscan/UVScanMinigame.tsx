import { useRef, useState, useEffect, useCallback } from 'react';
import type { UVScanData } from '../../../obj/notificationInterfaces';
import styles from './UVScanMinigame.module.css';

interface Props {
  data: UVScanData;
  onSuccess: () => void;
  onFailure: () => void;
}

const LENS_RADIUS = 90; // px
const DWELL_MS = 1000;  // ms hovering footprint centre = success

export function UVScanMinigame({ data, onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number>(0);

  // Mouse position relative to container (null = outside)
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  // 0–1 dwell progress for the ring indicator
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const overFootprint = useRef(false);

  // The footprint position is stored as a percentage of container size so it
  // is layout-independent. The game data carries it; we fall back to a random
  // position if the host didn't supply one.
  const footprintPos = data.footprintPos ?? { x: 0.55, y: 0.48 };

  // ─── dwell animation loop ───────────────────────────────────────────────
  const tickDwell = useCallback((now: number) => {
    if (!overFootprint.current || dwellStart.current === null) {
      setDwellProgress(0);
      return;
    }
    const elapsed = now - dwellStart.current;
    const progress = Math.min(elapsed / DWELL_MS, 1);
    setDwellProgress(progress);
    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(tickDwell);
    } else {
      onSuccess();
    }
  }, [onSuccess]);

  // ─── hit-test helper ────────────────────────────────────────────────────
  const isOverFootprint = useCallback(
    (mx: number, my: number, rect: DOMRect) => {
      const cx = footprintPos.x * rect.width;
      const cy = footprintPos.y * rect.height;
      const dx = mx - cx;
      const dy = my - cy;
      // footprint "hotspot" is roughly 28 px radius
      return Math.sqrt(dx * dx + dy * dy) < 28;
    },
    [footprintPos]
  );

  // ─── pointer events ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setMouse({ x: mx, y: my });

      const hit = isOverFootprint(mx, my, rect);
      if (hit && !overFootprint.current) {
        overFootprint.current = true;
        dwellStart.current = performance.now();
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(tickDwell);
      } else if (!hit && overFootprint.current) {
        overFootprint.current = false;
        dwellStart.current = null;
        cancelAnimationFrame(animFrameRef.current);
        setDwellProgress(0);
      }
    },
    [isOverFootprint, tickDwell]
  );

  const handleMouseLeave = useCallback(() => {
    setMouse(null);
    overFootprint.current = false;
    dwellStart.current = null;
    cancelAnimationFrame(animFrameRef.current);
    setDwellProgress(0);
  }, []);

  // cleanup
  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
  }, []);

  // ─── SVG dwell ring values ───────────────────────────────────────────────
  const RING_R = LENS_RADIUS - 6;
  const circumference = 2 * Math.PI * RING_R;
  const dashOffset = circumference * (1 - dwellProgress);

  return (
    <div className={styles.wrapper}>
      <p className={styles.instruction}>
        Scan the scene under UV light — find and hold the hidden evidence.
      </p>

      <div
        ref={containerRef}
        className={styles.scene}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Layer 1: normal background (always visible) ── */}
        <img
          src="/assets/normalBackground.png"
          alt=""
          className={styles.bgLayer}
          draggable={false}
        />

        {/* ── Layer 2: UV background (clipped to lens) ── */}
        {mouse && (
          <div
            className={styles.uvLayer}
            style={{
              '--lx': `${mouse.x}px`,
              '--ly': `${mouse.y}px`,
              '--lr': `${LENS_RADIUS}px`,
            } as React.CSSProperties}
          >
            <img
              src="/assets/blueLight.png"
              alt=""
              className={styles.bgLayer}
              draggable={false}
            />
            {/* footprint only visible under UV */}
            <img
              src="/assets/shoeprint.png"
              alt=""
              className={styles.footprint}
              style={{
                left: `${footprintPos.x * 100}%`,
                top: `${footprintPos.y * 100}%`,
              }}
              draggable={false}
            />
          </div>
        )}

        {/* ── Magnifying glass chrome ── */}
        {mouse && (
          <svg
            className={styles.lensSvg}
            style={{
              left: mouse.x - LENS_RADIUS - 4,
              top: mouse.y - LENS_RADIUS - 4,
              width: (LENS_RADIUS + 4) * 2,
              height: (LENS_RADIUS + 4) * 2,
            }}
            viewBox={`0 0 ${(LENS_RADIUS + 4) * 2} ${(LENS_RADIUS + 4) * 2}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* outer chrome ring */}
            <circle
              cx={LENS_RADIUS + 4}
              cy={LENS_RADIUS + 4}
              r={LENS_RADIUS + 2}
              fill="none"
              stroke="#8a7560"
              strokeWidth="4"
            />
            {/* dwell progress ring */}
            <circle
              cx={LENS_RADIUS + 4}
              cy={LENS_RADIUS + 4}
              r={RING_R}
              fill="none"
              stroke={dwellProgress > 0 ? '#00e5ff' : 'transparent'}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${LENS_RADIUS + 4} ${LENS_RADIUS + 4})`}
              style={{ transition: 'stroke 0.15s' }}
            />
            {/* crosshair */}
            <line
              x1={LENS_RADIUS + 4 - 10} y1={LENS_RADIUS + 4}
              x2={LENS_RADIUS + 4 + 10} y2={LENS_RADIUS + 4}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1"
            />
            <line
              x1={LENS_RADIUS + 4} y1={LENS_RADIUS + 4 - 10}
              x2={LENS_RADIUS + 4} y2={LENS_RADIUS + 4 + 10}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1"
            />
            {/* handle */}
            <line
              x1={LENS_RADIUS + 4 + LENS_RADIUS * 0.68}
              y1={LENS_RADIUS + 4 + LENS_RADIUS * 0.68}
              x2={LENS_RADIUS + 4 + LENS_RADIUS * 0.68 + 28}
              y2={LENS_RADIUS + 4 + LENS_RADIUS * 0.68 + 28}
              stroke="#6b5740"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* cursor-hide overlay */}
        <div className={styles.cursorHide} />
      </div>

      <p className={styles.hint}>
        <span className={styles.hintLabel}>Hint:</span> {data.hint}
      </p>
    </div>
  );
}