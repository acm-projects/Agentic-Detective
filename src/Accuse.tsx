import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from './useGameStore';
import './Accuse.css';

// ─── Audio helpers ────────────────────────────────────────────────────────────

function playWithFadeIn(src: string, fadeDuration = 1500): HTMLAudioElement {
  const audio = new Audio(src);
  audio.volume = 0;
  audio.play().catch(err => console.warn('Audio play failed:', err));

  const steps = 45;
  const interval = fadeDuration / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    audio.volume = Math.min(step / steps, 1);
    if (step >= steps) clearInterval(timer);
  }, interval);

  return audio;
}

// ─── Fireworks ────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  decay: number;
  radius: number;
  color: string;
}

const COLORS = [
  '#ff4e50','#fc913a','#f9ca24','#6ab04c',
  '#22a6b3','#be2edd','#e056fd','#fff',
];

function burst(cx: number, cy: number): Particle[] {
  const count = 60 + Math.floor(Math.random() * 40);
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      decay: 0.012 + Math.random() * 0.01,
      radius: 2 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });
}

function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let particles: Particle[] = [];
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Schedule random bursts
    const launchInterval = setInterval(() => {
      const cx = 0.15 * canvas.width + Math.random() * 0.7 * canvas.width;
      const cy = 0.1  * canvas.height + Math.random() * 0.5 * canvas.height;
      particles.push(...burst(cx, cy));
    }, 400);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // Update
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;          // gravity
        p.vx *= 0.98;          // drag
        p.alpha -= p.decay;
      });
      particles = particles.filter(p => p.alpha > 0.02);

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      clearInterval(launchInterval);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}

// ─── Police Siren ─────────────────────────────────────────────────────────────

function PoliceSiren() {
  const [color, setColor] = useState<'red' | 'blue'>('red');

  useEffect(() => {
    const id = setInterval(() => setColor(c => c === 'red' ? 'blue' : 'red'), 360);
    return () => clearInterval(id);
  }, []);

    return (
    <div
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        boxShadow: color === 'red'
          ? 'inset 0 0 120px 30px rgba(220,30,30,0.22)'
          : 'inset 0 0 120px 30px rgba(30,80,220,0.22)',
        transition: 'box-shadow 0.15s ease',
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Accuse() {
  const navigate = useNavigate();
  const { accusationResult, resetGame, player, currentSessionId } = useGameStore();

  const [phase, setPhase] = useState<'flash' | 'dark' | 'reveal'>('flash');
  const [gameplayRating, setGameplayRating] = useState<number | null>(null);
  const [featureOnLeaderboard, setFeatureOnLeaderboard] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);

  const saveFeedback = async (nextRating: number, nextFeatured: boolean) => {
    if (feedbackSaving) return;
    if (nextRating === null) {
      setFeedbackError('Please choose a rating first.');
      return;
    }

    const sessionId =
      currentSessionId ||
      player?.caseReport?.caseId ||
      localStorage.getItem('lastSessionId') ||
      localStorage.getItem('lastCaseId') ||
      '';

    if (!sessionId) {
      setFeedbackError('Could not determine case session id.');
      return;
    }

    setFeedbackSaving(true);
    setFeedbackError(null);
    try {
      const res = await fetch(`http://localhost:3000/cases/${encodeURIComponent(sessionId)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameplayRating: nextRating,
          featured: nextFeatured,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSaved(true);
    } catch {
      setFeedbackError('Could not save rating right now.');
    } finally {
      setFeedbackSaving(false);
    }
  };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dark'),   120);
    const t2 = setTimeout(() => setPhase('reveal'), 720);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!accusationResult) return;

    const { isCorrect } = accusationResult;

    if (isCorrect) {
      const cuffs = new Audio('../assets/freesound_community-handcuffs-94692.mp3');
      cuffs.play().catch(err => console.warn('Audio play failed:', err));
      const win = playWithFadeIn('assets/win.mp3');
      audioRefs.current = [cuffs, win];
    } else {
      const running = new Audio('../assets/km007-chase-running-9109.mp3');
      running.play().catch(err => console.warn('Audio play failed:', err));
      const lose = playWithFadeIn('assets/lose.mp3');
      audioRefs.current = [running, lose];
    }

    return () => {
      audioRefs.current.forEach(a => { a.pause(); a.currentTime = 0; });
    };
  }, [accusationResult]);

  if (!accusationResult) {
    return (
      <div className="accuse-page accuse-dark">
        <p className="accuse-redirect">
          No accusation made.{' '}
          <button onClick={() => navigate('/interrogate')}>Go Back</button>
        </p>
      </div>
    );
  }

  const { accusedName, isCorrect, trueKiller, explanation } = accusationResult;
  const caseCode = player?.caseReport?.caseId;

  return (
    <div className={`accuse-page ${phase === 'flash' ? 'accuse-flash' : 'accuse-dark'}`}>

      {/* Overlay effects — only shown after reveal */}
      {phase === 'reveal' && isCorrect  && <FireworksCanvas />}
      {phase === 'reveal' && !isCorrect && <PoliceSiren />}

      <div className={`accuse-content ${phase === 'reveal' ? 'accuse-visible' : ''}`}>

        <h1 className={`accuse-verdict ${isCorrect ? 'accuse-guilty' : 'accuse-innocent'}`}>
          {isCorrect
            ? `${accusedName} was guilty.`
            : `${accusedName} is innocent.`}
        </h1>

        <p className={`accuse-sub ${isCorrect ? 'accuse-guilty' : 'accuse-innocent'}`}>
          {isCorrect ? 'Case closed. Justice served.' : 'The killer is still out there…'}
        </p>

        {!isCorrect && (
          <p className="accuse-truth">
            The real killer was <span className="accuse-killer">{trueKiller}</span>.
          </p>
        )}

        {explanation && (
          <p className="accuse-explanation">{explanation}</p>
        )}

        {caseCode && (
          <p className="accuse-case-code">
            Case ID: <span>{caseCode}</span>
          </p>
        )}

        <div className="accuse-feedback-panel">
          <p className="accuse-feedback-title">Rate this game</p>
          <div className="accuse-rating-buttons" role="group" aria-label="Game rating">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={`accuse-rate-btn accuse-rate-star ${gameplayRating !== null && rating <= gameplayRating ? 'active' : ''}`}
                aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                onClick={async () => {
                  setGameplayRating(rating);
                  setFeedbackSaved(false);
                  setFeedbackError(null);
                  await saveFeedback(rating, featureOnLeaderboard);
                }}
              >
                ★
              </button>
            ))}
          </div>

          <label className="accuse-feature-toggle">
            <input
              type="checkbox"
              checked={featureOnLeaderboard}
              onChange={async (e) => {
                const nextFeatured = e.target.checked;
                setFeatureOnLeaderboard(nextFeatured);
                setFeedbackSaved(false);
                if (gameplayRating !== null) {
                  await saveFeedback(gameplayRating, nextFeatured);
                }
              }}
            />
            Do you want this game on the community board?
          </label>

          {feedbackSaving && <p className="accuse-feedback-saving">Saving...</p>}

          {feedbackSaved && <p className="accuse-feedback-success">Saved to community.</p>}
          {feedbackError && <p className="accuse-feedback-error">{feedbackError}</p>}
        </div>

        <div className="accuse-buttons">
          <button
            className="accuse-btn"
            onClick={() => {
              audioRefs.current.forEach(a => { a.pause(); a.currentTime = 0; });
              resetGame();
              navigate('/');
            }}
          >
            New Case
          </button>
        </div>

      </div>
    </div>
  );
}

export default Accuse;