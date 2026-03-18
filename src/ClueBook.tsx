import { useState, useEffect } from "react";
import { useGameStore } from "./useGameStore";
import type { Clue } from "./caseFile";
import "./ClueBook.css";
import { useNavigate } from 'react-router-dom';

export default function ClueBook() {
  const { player } = useGameStore();
  const [selected, setSelected] = useState<Clue | null>(null);
  const [examined, setExamined] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [clues, setClues] = useState(player?.clues ?? []);

  useEffect(() => {
    // If Zustand has clues, use them
    if (player?.clues?.length) {
      setClues(player.clues);
      return;
    }
    // Otherwise fall back to fetching from MongoDB
    const caseId = player?.caseReport?.caseId;
    if (!caseId) return;
    fetch(`http://localhost:3000/case/${caseId}/clues`)
      .then(r => r.json())
      .then(setClues)
      .catch(console.warn);
  }, [player]);

  const handleClueClick = (clue: Clue) => {
    setSelected(clue);
    setExamined(prev => new Set(prev).add(clue.id));
  };

  return (
    <div className="clue-book-overlay">
      <div className="clue-book">
        {/* Pixel corners */}
        <div className="pixel-corner tl" />
        <div className="pixel-corner tr" />

        {/* Header */}
        <div className="clue-book-header">
          <span className="pixel-title-text">CLUES</span>
          <div className="pixel-title-underline" />
          <div className="clue-book-subtitle">
            {examined.size} / {clues.length} EXAMINED
          </div>
        </div>

        {/* ── Body: grid left, detail right ── */}
        <div className="clue-book-body">
          {/* Left: 2×3 clue grid */}
          <div className="clue-grid">
            {clues.length === 0 ? (
              <div className="clue-empty">NO CLUES COLLECTED YET</div>
            ) : (
              clues.slice(0, 6).map((clue, i) => {
                const isExamined = examined.has(clue.id);
                const isSelected = selected?.id === clue.id;
                return (
                  <button
                    key={clue.id}
                    className={`clue-card ${isExamined ? "examined" : ""} ${isSelected ? "active" : ""} ${clue.isDecisive ? "decisive" : ""}`}
                    onClick={() => handleClueClick(clue)}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="clue-card-icon">
                    <img src={`/clues/locker.png`} alt={`locker img`} className="pixel-icon-locker" />
                      <PixelIcon index={i} decisive={clue.isDecisive} />
                    </div>
                    {!isExamined && <div className="clue-new-badge">NEW</div>}
                    {clue.isDecisive && <div className="clue-decisive-badge">★</div>}
                    <div className="clue-card-name">{clue.name}</div>
                    <div className="clue-card-location">{clue.location}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: detail panel */}
          {selected ? (
            <div className="clue-detail">
              <div className="clue-detail-icon-large">
                <PixelIcon
                  index={clues.findIndex(c => c.id === selected.id)}
                  decisive={selected.isDecisive}
                  large
                />
              </div>
              <div className="clue-detail-header">
                <div>
                  <div className="clue-detail-name">{selected.name}</div>
                  <div className="clue-detail-location">📍 {selected.location}</div>
                  {selected.isDecisive && (
                    <div className="clue-detail-decisive">★ KEY EVIDENCE</div>
                  )}
                </div>
                <button className="clue-detail-close" onClick={() => setSelected(null)}>✕</button>
              </div>

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

              <div className="clue-detail-scanlines" />
            </div>
          ) : (
            <div className="clue-detail clue-detail-empty">
              <div className="clue-detail-empty-icon">?</div>
              <div className="clue-detail-empty-text">SELECT A CLUE TO EXAMINE</div>
            </div>
          )}
        </div>

        <button className="back-btn" onClick={() => navigate('/desk')}>Back to desk</button>

        {/* Book corners */}
        <div className="pixel-corner bl" />
        <div className="pixel-corner br" />
      </div>
    </div>
  );
}

function PixelIcon({ index, decisive = false, large = true }: { index: number; decisive?: boolean; large?: boolean }) {
  const imagePath = `/clues/clue_${index + 1}.png`; // Fixed: use public folder root path
  return (
    <div className={`pixel-icon-wrap ${large ? "large" : ""} ${decisive ? "decisive" : ""}`}>
      <img src={imagePath} alt={`Clue ${index + 1}`} className="pixel-icon-image" />
    </div>
  );
}
