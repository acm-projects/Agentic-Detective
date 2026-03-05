import { useState } from "react";
import { useGameStore } from "./useGameStore";
import type { Clue } from "./caseFile";
import "./ClueBook.css";

export default function ClueBook() {
  const { player } = useGameStore();
  const clues = player?.clues ?? [];
  const [selected, setSelected] = useState<Clue | null>(null);
  const [examined, setExamined] = useState<Set<string>>(new Set());

  const handleClueClick = (clue: Clue) => {
    setSelected(clue);
    setExamined(prev => new Set(prev).add(clue.id));
  };

  return (
    <div className="clue-book-overlay">

      {/* ── Book cover / spine ── */}
      <div className="clue-book">

        {/* Pixel header */}
        <div className="clue-book-header">
          <div className="pixel-corner tl" />
          <div className="pixel-corner tr" />
          <div className="clue-book-title">
            <span className="pixel-title-text">CLUES</span>
            <div className="pixel-title-underline" />
          </div>
          <div className="clue-book-subtitle">
            {examined.size} / {clues.length} EXAMINED
          </div>
        </div>

        {/* ── Grid of clue cards ── */}
        <div className="clue-grid">
          {clues.length === 0 && (
            <div className="clue-empty">NO CLUES COLLECTED YET</div>
          )}
          {clues.map((clue, i) => {
            const isExamined = examined.has(clue.id);
            const isSelected = selected?.id === clue.id;
            return (
              <button
                key={clue.id}
                className={`clue-card ${isExamined ? "examined" : ""} ${isSelected ? "active" : ""} ${clue.isDecisive ? "decisive" : ""}`}
                onClick={() => handleClueClick(clue)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Pixel icon based on index */}
                <div className="clue-card-icon">
                  <PixelIcon index={i} decisive={clue.isDecisive} />
                </div>

                {/* New badge */}
                {!isExamined && <div className="clue-new-badge">NEW</div>}
                {/* Decisive star */}
                {clue.isDecisive && <div className="clue-decisive-badge">★</div>}

                <div className="clue-card-name">{clue.name}</div>
                <div className="clue-card-location">{clue.location}</div>
              </button>
            );
          })}
        </div>

        {/* ── Detail panel ── */}
        {selected ? (
          <div className="clue-detail">
            <div className="clue-detail-header">
              <div className="clue-detail-icon-large">
                <PixelIcon
                  index={clues.findIndex(c => c.id === selected.id)}
                  decisive={selected.isDecisive}
                  large
                />
              </div>
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

            {/* Pixel scan line effect */}
            <div className="clue-detail-scanlines" />
          </div>
        ) : (
          <div className="clue-detail clue-detail-empty">
            <div className="clue-detail-empty-icon">?</div>
            <div className="clue-detail-empty-text">
              SELECT A CLUE TO EXAMINE
            </div>
          </div>
        )}

        {/* Book corners */}
        <div className="pixel-corner bl" />
        <div className="pixel-corner br" />
      </div>
    </div>
  );
}

// ── Pixel icons — deterministic per index, CSS-drawn ──
function PixelIcon({ index, decisive, large }: { index: number; decisive?: boolean; large?: boolean }) {
  const icons = ["🔍", "🗒️", "🔑", "💊", "🧤", "📱", "🔫", "✉️", "💉", "🪓", "👁️", "🕯️"];
  const icon = icons[index % icons.length];
  return (
    <div className={`pixel-icon-wrap ${large ? "large" : ""} ${decisive ? "decisive" : ""}`}>
      {icon}
    </div>
  );
}
