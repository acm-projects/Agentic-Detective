import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from './useGameStore';
import s1 from './assets/s1.png';
import s2 from './assets/s2.png';
import s3 from './assets/s3.png';
import s4 from './assets/s4.png';
import jailHer from './assets/jailher.gif';
import who from './assets/updatedwho.png';
import decor from './assets/decor.png';
import newspaper from './assets/newsdecor.png';
import victim from './assets/choppedvictim.png';
import clipping from './assets/clipping.png';
import layout from './assets/layout.png';
import SuspectPortrait from './components/SuspectPortrait';
import './Suspects.css';

// ─────────────────────────────────────────────
const WHO = { x: 50, y: 38 };

const POLAROID_PINS = {
  'top-left':     { x: 22, y: 12 },
  'top-right':    { x: 79, y: 12 },
  'bottom-left':  { x: 24, y: 56 },
  'bottom-right': { x: 74, y: 56 },
};
// ─────────────────────────────────────────────

const CORNER_KEYS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
type CornerCls = typeof CORNER_KEYS[number];

const CORNER_IMGS: Record<CornerCls, string> = {
  'top-left':     s1,
  'top-right':    s2,
  'bottom-left':  s3,
  'bottom-right': s4,
};

const dot = (x: number, y: number): React.CSSProperties => ({
  position: 'absolute',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: '#af0f0f',
  left: `calc(${x}% - 5px)`,
  top: `calc(${y}% - 5px)`,
  pointerEvents: 'none',
  zIndex: 10,
});

function Suspects() {
  const navigate = useNavigate();
  const { player, makeAccusation, accusationUnlocked } = useGameStore();
  const profiles = player?.characterProfiles ?? [];

  const cornerProfiles: Partial<Record<CornerCls, typeof profiles[number]>> = {};
  CORNER_KEYS.forEach((cls, i) => {
    if (profiles[i]) cornerProfiles[cls] = profiles[i];
  });

  const [popup, setPopup] = useState<{ cls: CornerCls; name: string } | null>(null);
  const [arrestedCorner, setArrestedCorner] = useState<CornerCls | null>(null);

  const handlePolaroidClick = (cls: CornerCls) => {
    if (arrestedCorner) return;
    if (!accusationUnlocked) {
      alert('You need to discover at least 2 clues before making an accusation.');
      return;
    }

    const profile = cornerProfiles[cls];
    if (!profile) return;
    setPopup({ cls, name: profile.name });
  };

  const handleArrest = () => {
    if (!popup) return;
    setArrestedCorner(popup.cls);
    setPopup(null);
    setTimeout(() => makeAccusation(popup.name, navigate), 1800);
  };

  const getBadgeClass = (cls: CornerCls) => `suspect-name-badge ${cls}`;

  return (
    <div className="suspects-page">

      {/* Back to desk button */}
      <button
        onClick={() => navigate('/desk')}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 200,
          fontFamily: "'Press Start 2P', cursive",
          fontSize: '0.5rem',
          background: '#111',
          color: '#fff',
          border: '3px solid #fff',
          boxShadow: '3px 3px 0 #111',
          padding: '0.5em 0.8em',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        ← BACK
      </button>

      {/* Red strings SVG layer */}
      <svg className="strings-svg">
        {CORNER_KEYS.map((cls) => {
          const pin = POLAROID_PINS[cls];
          return (
            <line
              key={cls}
              x1={`${pin.x}%`}  y1={`${pin.y}%`}
              x2={`${WHO.x}%`}  y2={`${WHO.y}%`}
              stroke="#af0f0f"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}
      </svg>

      {/* Dots at polaroid ends */}
      {CORNER_KEYS.map((cls) => {
        const pin = POLAROID_PINS[cls];
        return <div key={`dot-${cls}`} style={dot(pin.x, pin.y)} />;
      })}

      {/* Dot at who center */}
      <div style={dot(WHO.x, WHO.y)} />

      <h1 className="arrest-title">ARREST</h1>

      {CORNER_KEYS.map((cls) => (
        <div
          key={cls}
          className={`suspect-corner ${cls}`}
          onClick={() => handlePolaroidClick(cls)}
        >
          <img src={CORNER_IMGS[cls]} alt="polaroid" className="polaroid-bg" />
          <div className="character-avatar">
            {cornerProfiles[cls]?.portraitFeatures ? (
              <SuspectPortrait
                features={cornerProfiles[cls]!.portraitFeatures}
                size={300}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="character-avatar-fallback" />
            )}
          </div>
          {cornerProfiles[cls]?.name && (
            <div className={getBadgeClass(cls)}>
              {cornerProfiles[cls]!.name}
            </div>
          )}
          {arrestedCorner === cls && (
            <img src={jailHer} alt="jail" className="jailher-overlay" />
          )}
        </div>
      ))}

      <img src={who}       alt="who"       className="who-center" />
      <img src={decor}     alt="decor"     className="decor" />
      <img src={newspaper} alt="newspaper" className="newspaper" />
      <img src={victim}    alt="victim"    className="victim" />
      <img src={clipping}  alt="clipping"  className="clipping" />
      <img src={layout}    alt="layout"    className="layout" />

      {/* Arrest popup */}
      {popup && (
        <>
          <div className="arrest-overlay" onClick={() => setPopup(null)} />
          <div className="arrest-popup">
            <p className="arrest-popup-label">ARREST</p>
            <p className="arrest-popup-name">{popup.name.toUpperCase()}?</p>
            <div className="arrest-popup-buttons">
              <button className="arrest-confirm" onClick={handleArrest}>CONFIRM</button>
              <button className="arrest-cancel"  onClick={() => setPopup(null)}>CANCEL</button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default Suspects;