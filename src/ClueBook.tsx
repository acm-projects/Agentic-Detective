import { useState } from "react";
import { useGameStore } from "./useGameStore";
import type { Clue } from "./caseFile";
import "./ClueBook.css";
import { useNavigate } from 'react-router-dom';
import deskBgImg from './assets/chopped.png';
import printsclueImg from './assets/3printsclue.png';
import artImg from './assets/1mutedart.png';
import ciphpolImg from './assets/ciphpol.png';
import weappolImg from './assets/weappol.png';
import stickyImg from './assets/sticky.png';
import bluestickyImg from './assets/4sticky.png';
import letterImg from './assets/lettersclue.png';
import jewelImg from './assets/jewel.png';
import yellowstickyImg from './assets/yellowsticky.png';

const CLUE_PROPS = [
  { src: jewelImg,      width: '220px', bottom: '8%',  left: '55%',  transform: 'translateX(-50%) rotate(15deg)' },
  { src: weappolImg,    width: '220px', bottom: '45%', right: '42%', transform: 'translateX(50%) rotate(10deg)' },
  { src: artImg,        width: '300px', top: '5%',     left: '3%',   transform: 'rotate(-4deg)' },
  { src: letterImg,     width: '290px', bottom: '40%', left: '38%',  transform: 'translateX(-50%) rotate(15deg)' },
  { src: ciphpolImg,    width: '300px', top: '63%',    left: '26%',  transform: 'rotate(4deg)' },
  { src: printsclueImg, width: '300px', bottom: '12%', left: '15%',  transform: 'translateX(-50%) rotate(-10deg)' },
];

export default function ClueBook() {
  const { player } = useGameStore();
  const clues = player?.clues ?? [];
  const [selected, setSelected] = useState<Clue | null>(null);
  const navigate = useNavigate();

  const handlePropClick = (index: number) => {
    const clue = clues[index];
    if (!clue) return;
    setSelected(clue);
  };

  const decor = {
    position: 'fixed' as const,
    imageRendering: 'pixelated' as const,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    filter: 'drop-shadow(8px 8px 0px rgba(0,0,0,0.5))',
    zIndex: 7,
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      backgroundImage: `url(${deskBgImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflow: 'hidden',
    }}>

      <div className="clue-board-title">CLUE BOARD</div>

      <img src={stickyImg}       alt="" style={{ ...decor, width: '150px', bottom: '71%', left: '23%', transform: 'translateX(-50%) rotate(-10deg)' }} />
      <img src={bluestickyImg}   alt="" style={{ ...decor, width: '150px', bottom: '6%',  left: '6%',  transform: 'translateX(-50%) rotate(15deg)' }} />
      <img src={yellowstickyImg} alt="" style={{ ...decor, width: '150px', bottom: '6%',  left: '60%', transform: 'translateX(-50%) rotate(-15deg)' }} />

      {CLUE_PROPS.map((prop, i) => {
        const clue = clues[i];
        const isSelected = clue && selected?.id === clue.id;
        return (
          <div
            key={i}
            className={`clue-prop-wrap ${isSelected ? 'prop-selected' : ''}`}
            style={{
              position: 'fixed',
              width: prop.width,
              bottom: (prop as any).bottom,
              top: (prop as any).top,
              left: (prop as any).left,
              right: (prop as any).right,
              transform: prop.transform,
              cursor: clue ? 'pointer' : 'default',
              zIndex: 3,
              willChange: 'filter',
            }}
            onClick={() => handlePropClick(i)}
          >
            <img
              src={prop.src}
              alt=""
              style={{
                width: '100%',
                imageRendering: 'pixelated',
                display: 'block',
                transform: 'translateZ(0)',
                filter: isSelected
                  ? 'drop-shadow(0px 0px 8px rgba(255,255,255,0.9)) drop-shadow(0px 0px 16px rgba(255,255,255,0.6)) drop-shadow(8px 8px 0px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0px 0px 8px rgba(255,255,255,0)) drop-shadow(0px 0px 16px rgba(255,255,255,0)) drop-shadow(8px 8px 0px rgba(0,0,0,0.5))',
              }}
            />
          </div>
        );
      })}

      <svg
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 5 }}
        viewBox="0 0 1280 860"
        preserveAspectRatio="xMidYMid slice"
      >
        <line x1="180" y1="490" x2="490" y2="540" stroke="#af0f0f" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        <line x1="490" y1="540" x2="760" y2="255" stroke="#af0f0f" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        <line x1="200" y1="180" x2="710" y2="540" stroke="#af0f0f" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        <circle cx="180" cy="490" r="5" fill="#af0f0f" opacity="0.9" />
        <circle cx="490" cy="540" r="5" fill="#af0f0f" opacity="0.9" />
        <circle cx="760" cy="255" r="5" fill="#af0f0f" opacity="0.9" />
        <circle cx="200" cy="180" r="5" fill="#af0f0f" opacity="0.9" />
        <circle cx="710" cy="540" r="5" fill="#af0f0f" opacity="0.9" />
      </svg>

      {selected && (
        <div className="clue-detail-panel">
          <div className="clue-detail-scanlines" />
          <button className="clue-detail-close" onClick={() => setSelected(null)}>✕</button>
          <div className="clue-detail-name">{selected.name}</div>
          <div className="clue-detail-location">📍 {selected.location}</div>
          {selected.isDecisive && <div className="clue-detail-decisive">★ KEY EVIDENCE</div>}
          <div className="clue-detail-divider" />
          <p className="clue-detail-description">{selected.description}</p>
          {selected.couldImplicateSuspects.length > 0 && (
            <div className="clue-detail-suspects">
              <div className="clue-suspects-label">COULD IMPLICATE:</div>
              <div className="clue-suspects-list">
                {selected.couldImplicateSuspects.map(name => (
                  <span key={name} className="clue-suspect-tag">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button className="back-btn" onClick={() => navigate('/desk')}>
        Back to desk
      </button>

    </div>
  );
}