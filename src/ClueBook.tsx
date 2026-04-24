import { useEffect, useMemo, useState } from "react";
import type { Clue } from "./caseFile";
import "./ClueBook.css";
import { useNavigate } from 'react-router-dom';
import deskBgImg from './assets/3chopped.png';
import printsclueImg from './assets/3printsclue.png';
import artImg from './assets/1mutedart.png';
import ciphpolImg from './assets/ciphpol.png';
import weappolImg from './assets/weappol.png';
import stickyImg from './assets/sticky.png';
import bluestickyImg from './assets/4sticky.png';
import letterImg from './assets/lettersclue.png';
import jewelImg from './assets/jewel.png';
import yellowstickyImg from './assets/yellowsticky.png';
import { useNotificationStore } from './store/useNotificationStore';
import { useGameStore } from "./useGameStore";
import TutorialModal from './components/tutorial-modal/Tutorial';

const CLUE_PROPS = [
  { src: printsclueImg, width: '220px', bottom: '15%',  left: '55%',  transform: 'translateX(-50%) rotate(15deg)' },
  { src: weappolImg,    width: '220px', bottom: '45%', right: '42%', transform: 'translateX(50%) rotate(10deg)' },
  { src: artImg,        width: '300px', top: '5%',     left: '3%',   transform: 'rotate(-4deg)' },
  { src: letterImg,     width: '290px', bottom: '40%', left: '38%',  transform: 'translateX(-50%) rotate(15deg)' },
  { src: ciphpolImg,    width: '300px', top: '63%',    left: '24%',  transform: 'rotate(4deg)' },
  { src: jewelImg, width: '300px', bottom: '12%', left: '15%',  transform: 'translateX(-50%) rotate(-10deg)' },
];

export default function ClueBook() {
  const allClues = useNotificationStore(s => s.clues);
  const clues = useMemo(() => allClues.filter(clue => clue.discovered), [allClues]);
  const [selected, setSelected] = useState<Clue | null>(null);
  const [examined, setExamined] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const difficulty = useGameStore.getState().seed?.difficulty;
  const totalConversationCount = useGameStore.getState().totalConversationCount;
  const isFirstTimePlayer = totalConversationCount <= 2;

  useEffect(() => {
    const clueIds = new Set(clues.map(clue => clue.id));
    setExamined(prev => {
      const next = new Set(Array.from(prev).filter(id => clueIds.has(id)));
      const unchanged = prev.size === next.size && Array.from(prev).every(id => next.has(id));
      return unchanged ? prev : next;
    });
    if (selected && !clueIds.has(selected.id)) {
      setSelected(null);
    }
  }, [clues, selected]);

  const handleClueClick = (clue: Clue) => {
    setSelected(clue);
    setExamined(prev => new Set(prev).add(clue.id));
  };

  const decor = {
    position: 'fixed' as const,
    imageRendering: 'pixelated' as const,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    filter: 'drop-shadow(8px 8px 0px rgba(0,0,0,0.5))',
    zIndex: 7,
  };

  const selectedIndex = selected ? clues.findIndex(c => c.id === selected.id) : -1;

  return (
    <>
      <TutorialModal />
      <div className="main-container" style={{
        width: '100%',
        height: '100dvh',
        minHeight: '100vh',
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${deskBgImg})`,
        backgroundSize: '112% 112%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}>

      <div className="clue-board-title">CLUE BOARD</div>
      <div className="pixel-title-underline" />
      <div className="clue-book-subtitle">
        {examined.size} / {clues.length} EXAMINED
      </div>

      <div>
        <img src={stickyImg}       alt="" style={{ ...decor, width: '150px', bottom: '71%', left: '23%', transform: 'translateX(-50%) rotate(-10deg)' }} />
        <img src={bluestickyImg}   alt="" style={{ ...decor, width: '150px', bottom: '12%',  left: '6%',  transform: 'translateX(-50%) rotate(15deg)' }} />
        <img src={yellowstickyImg} alt="" style={{ ...decor, width: '150px', bottom: '6%',  left: '60%', transform: 'translateX(-50%) rotate(-15deg)' }} />

        <div className="clue-board-grid">
          {CLUE_PROPS.map((prop, i) => {
            const clue = clues[i];
            const isDiscovered = !!clue;
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
                  cursor: isDiscovered ? 'pointer' : 'default',
                  zIndex: 3,
                  willChange: 'filter',
                }}
                onClick={() => clue && handleClueClick(clue)}
              >
                <img
                  src={prop.src}
                  alt=""
                  style={{
                    width: '100%',
                    imageRendering: 'pixelated',
                    display: 'block',
                    transform: 'translateZ(0)',
                    opacity: isDiscovered ? 1 : 0.4,
                    filter: isSelected
                      ? 'drop-shadow(0px 0px 8px rgba(255,255,255,0.9)) drop-shadow(0px 0px 16px rgba(255,255,255,0.6)) drop-shadow(8px 8px 0px rgba(0,0,0,0.5))'
                      : isDiscovered
                      ? 'drop-shadow(0px 0px 10px rgba(255,220,50,0.8)) drop-shadow(0px 0px 20px rgba(255,180,0,0.4)) drop-shadow(8px 8px 0px rgba(0,0,0,0.5))'
                      : 'drop-shadow(8px 8px 0px rgba(0,0,0,0.5))',
                  }}
                />
              </div>
            );
          })}
        </div>

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

        {selected && selectedIndex >= 0 ? (
          <div className="clue-detail">
            <div className="clue-detail-inner">
              <button className="clue-detail-close" onClick={() => setSelected(null)}>✕</button>
              <div className="clue-detail-scanlines" />
              <div className="clue-detail-name">{selected.name}</div>
              <div className="clue-detail-location">📍 {selected.location}</div>
              {selected.isDecisive && (
                <div className="clue-detail-decisive">★ KEY EVIDENCE</div>
              )}
              <div className="clue-detail-divider" />
              <p className="clue-detail-description">{selected.description}</p>
              
              {/* COULD IMPLICATE ... ONLY SHOWS UP IF DIFFICULTY SET TO 1, I.E. EASY*/}
              {difficulty === 1 && (
                <>
                  {(() => {
                    const suspects = Array.isArray(selected.couldImplicateSuspects)
                      ? selected.couldImplicateSuspects
                      : typeof selected.couldImplicateSuspects === "string"
                      ? (selected.couldImplicateSuspects as string)
                          .split(",")
                          .map(s => s.trim())
                          .filter(Boolean)
                      : [];
                    return suspects.length > 0 ? (
                      <div className="clue-detail-suspects">
                        <div className="clue-suspects-label">COULD IMPLICATE:</div>
                        <div className="clue-suspects-list">
                          {suspects.map(name => (
                            <span key={name} className="clue-suspect-tag">{name}</span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </>

              )}
                

            </div>
          </div>
        ) : (
          <div className="clue-detail clue-detail-empty">
            <div className="clue-detail-empty-icon">?</div>
            <div className="clue-detail-empty-text">SELECT A CLUE TO EXAMINE</div>
          </div>
        )}
      </div>
      
      <div className="back-btn-row">
        <button className="back-btn" onClick={() => navigate('/desk')}>
          Back to desk
        </button>
        {!isFirstTimePlayer && (
          <button className="back-btn" onClick={() => navigate('/interrogate')}>
            Back to Interrogation
          </button>
        )}
        
      </div>

      </div>
    </>
  );
}