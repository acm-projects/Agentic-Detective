import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from './useGameStore';
import './Accuse.css';

function Accuse() {
  const navigate = useNavigate();
  const { accusationResult, resetGame } = useGameStore();

  const [phase, setPhase] = useState<'flash' | 'dark' | 'reveal'>('flash');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dark'),   120);
    const t2 = setTimeout(() => setPhase('reveal'), 720);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // No accusation made yet — redirect back
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

  return (
    <div className={`accuse-page ${phase === 'flash' ? 'accuse-flash' : 'accuse-dark'}`}>
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

        <div className="accuse-buttons">
          <button
            className="accuse-btn"
            onClick={() => { resetGame(); navigate('/'); }}
          >
            New Case
          </button>
        </div>

      </div>
    </div>
  );
}

export default Accuse;