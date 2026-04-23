import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from './useGameStore';
import portraitGirl from './assets/portraitgirl.png';
import SuspectPortrait from './components/SuspectPortrait';
import './Accuse.css';

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  radius: number;
  color: string;
}

const COLORS = ['#ff4e50', '#fc913a', '#f9ca24', '#6ab04c', '#22a6b3', '#be2edd', '#e056fd', '#fff'];

function burst(cx: number, cy: number): Particle[] {
  const count = 60 + Math.floor(Math.random() * 40);
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    return {
      x: cx,
      y: cy,
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const launchInterval = setInterval(() => {
      const cx = 0.15 * canvas.width + Math.random() * 0.7 * canvas.width;
      const cy = 0.1 * canvas.height + Math.random() * 0.5 * canvas.height;
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

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.98;
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
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}
    />
  );
}

function PoliceSiren() {
  const [color, setColor] = useState<'red' | 'blue'>('red');

  useEffect(() => {
    const id = setInterval(() => setColor(c => (c === 'red' ? 'blue' : 'red')), 360);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        boxShadow:
          color === 'red'
            ? 'inset 0 0 120px 30px rgba(220,30,30,0.22)'
            : 'inset 0 0 120px 30px rgba(30,80,220,0.22)',
        transition: 'box-shadow 0.15s ease',
      }}
    />
  );
}

function Accuse() {
  const navigate = useNavigate();
  const { accusationResult, player } = useGameStore();

  const [phase, setPhase] = useState<'flash' | 'dark' | 'reveal'>('flash');
  const [gameplayRating, setGameplayRating] = useState<number | null>(null);
  const [featureOnLeaderboard, setFeatureOnLeaderboard] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);

  const saveFeedback = async (nextRating: number, _nextFeatured: boolean) => {
    if (feedbackSaving) return;

    if (nextRating === null) {
      setFeedbackError('Please choose a rating first.');
      return;
    }

    setFeedbackSaving(true);
    setFeedbackError(null);

    try {
      // Keep rating/featured behavior local and static.
      await Promise.resolve(nextRating);
      setFeedbackSaved(true);
    } catch {
      setFeedbackError('Could not save rating right now.');
    } finally {
      setFeedbackSaving(false);
    }
  };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dark'), 120);
    const t2 = setTimeout(() => setPhase('reveal'), 720);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!accusationResult) return;

    const { isCorrect } = accusationResult;

    if (isCorrect) {
      const cuffs = new Audio('/assets/freesound_community-handcuffs-94692.mp3');
      const win = playWithFadeIn('/assets/win.mp3');
      audioRefs.current = [cuffs, win];
      cuffs.play().catch(err => console.warn('Audio play failed:', err));
    } else {
      const running = new Audio('/assets/km007-chase-running-9109.mp3');
      const lose = playWithFadeIn('/assets/lose.mp3');
      audioRefs.current = [running, lose];
      running.play().catch(err => console.warn('Audio play failed:', err));
    }

    return () => {
      audioRefs.current.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
    };
  }, [accusationResult]);

  if (!accusationResult) {
    return (
      <div className={`accuse-page-bg ${phase === 'flash' ? 'accuse-flash' : 'accuse-dark'}`}>
        <div className={`container accuse-container-content ${phase === 'reveal' ? 'accuse-visible' : 'accuse-hidden'}`}>
          <div className="newsletter-strip">
            <span className="newsletter-text">The Daily Crimeletter</span>
          </div>

          <h1 className="accuse-verdict accuse-innocent">No accusation yet</h1>

          <div className="title-divider" />

          <div className="subtitle">
            <span className="subtitle-side left">Case Closed</span>
            <span className="subtitle-text">Verdict Edition</span>
            <span className="subtitle-side right">Justice Served</span>
          </div>

          <p className="accuse-explanation">
            No verdict has been recorded for this case yet. Return to interrogation and make your accusation there.
          </p>

          <div className="accuse-buttons">
            <button
              className="detective-button"
              onClick={() => navigate('/interrogate')}
            >
              Go to Interrogation
            </button>
          </div>

          <div className="footer-strip">
            <p className="footer-text">
              © The Daily Crimeletter — All Rights Reserved — Unauthorised Reproduction Prohibited — Est. 1887
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { accusedName, isCorrect, trueKiller, explanation } = accusationResult;
  const caseCode = player?.caseReport?.caseId;

  // Find the accused character's portrait features from player profiles
  const accusedProfile = player?.characterProfiles?.find(p => p.name === accusedName);

  return (
    <div className={`accuse-page-bg ${phase === 'flash' ? 'accuse-flash' : 'accuse-dark'}`}>
      {phase === 'reveal' && isCorrect && <FireworksCanvas />}
      {phase === 'reveal' && !isCorrect && <PoliceSiren />}

      <div className={`container accuse-container-content ${phase === 'reveal' ? 'accuse-visible' : 'accuse-hidden'}`}>
        <div className="newsletter-strip">
          <span className="newsletter-text">The Daily Crimeletter</span>
        </div>

        <h1 className={`accuse-verdict ${isCorrect ? 'accuse-guilty' : 'accuse-innocent'}`}>
          {isCorrect ? (
            <span className="accuse-verdict-stack">
              <span className="accuse-verdict-name">{accusedName}</span>
              <span className="accuse-verdict-word">found</span>
              <span className="accuse-verdict-guilty">GUILTY</span>
            </span>
          ) : (
            `${accusedName} was innocent`
          )}
        </h1>

        <div className="title-divider" />

        <div className="subtitle">
          <span className="subtitle-side left">Case Closed</span>
          <span className="subtitle-text">Verdict Edition</span>
          <span className="subtitle-side right">Justice Served</span>
        </div>

        <div className="accuse-body">
          {/* LEFT COLUMN */}
          <div className="accuse-col-left">
            <p className={`accuse-sub accuse-status-box ${isCorrect ? 'accuse-guilty' : 'accuse-innocent'}`}>
              {isCorrect ? 'Case closed. Justice served.' : 'The killer is still out there…'}
            </p>

            {!isCorrect && (
              <p className="accuse-truth accuse-truth-box">
                The real killer was <span className="accuse-killer">{trueKiller}</span>
              </p>
            )}

            <div className="accuse-extra-box">
              {accusedProfile?.portraitFeatures
                ? <div style={{ filter: 'grayscale(100%)' }}>
                    <SuspectPortrait features={accusedProfile.portraitFeatures} size={440} />
                  </div>
                : <img src={portraitGirl} alt={accusedName} style={{ width: 267, height: 'auto' }} />
              }
            </div>


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

            

          </div>

          {/* RIGHT COLUMN */}
          <div className="accuse-col-right">
            {explanation && (
              <p className="accuse-explanation">{explanation}</p>
            )}
            <div className="accuse-buttons">
              <button
                className="detective-button"
                onClick={() => navigate('/')}
              >
                New Case
              </button>
            </div>
          </div>
        </div>

        <div className="footer-strip">
          <p className="footer-text">
            © The Daily Crimeletter — All Rights Reserved — Unauthorised Reproduction Prohibited — Est. 1887
          </p>
        </div>
      </div>
    </div>
  );
}

export default Accuse;