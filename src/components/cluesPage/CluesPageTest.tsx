import { useState } from "react";
import { useGameStore } from "../../useGameStore"
import { useNotificationStore } from "../../store/useNotificationStore";
import type { Clue } from "../../caseFile"
import "../../ClueBook.css"
import { useNavigate } from "react-router";

// ── Clue type → display label ──────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  clue_1: "JEWEL",
  clue_2: "WEAPON",
  clue_3: "PAINTING",
  clue_4: "LETTER",
  clue_5: "CIPHER",
  clue_6: "PRINTS",
};

function getTypeLabel(id: string) {
  return TYPE_LABELS[id] ?? "EVIDENCE";
}

// ── Severity colour accent ─────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  minor: "#625111",
  major: "#8b2a14",
};

// ── Single clue card ───────────────────────────────────────
function ClueCard({
  clue,
  index,
  isSelected,
  isExamined,
  isUnlocked,
  onClick,
}: {
  clue: Clue;
  index: number;
  isSelected: boolean;
  isExamined: boolean;
  isUnlocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "cb-card",
        isSelected ? "cb-card--active" : "",
        isExamined ? "cb-card--examined" : "",
        isUnlocked ? "cb-card--unlocked" : "",
        clue.severity === "major" ? "cb-card--major" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Tape strip at top */}
      <div className="cb-card__tape" />

      {/* Clue image */}
      <div className="cb-card__img-wrap">
        <img
          src={`/clues/clue_${index + 1}.png`}
          alt={clue.name}
          className="cb-card__img"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
        {isUnlocked && (
          <div className="cb-card__unlock-stamp">UNLOCKED</div>
        )}
      </div>

      {/* Labels */}
      <div className="cb-card__footer">
        <span className="cb-card__type">{getTypeLabel(clue.id)}</span>
        <span className="cb-card__name">{clue.name}</span>
      </div>

      {/* Badges */}
      {!isExamined && <div className="cb-badge cb-badge--new">NEW</div>}
      {clue.severity === "major" && (
        <div className="cb-badge cb-badge--major">★</div>
      )}
      {isExamined && <div className="cb-examined-mark">✓</div>}
    </button>
  );
}

// ── Detail panel ───────────────────────────────────────────
function ClueDetail({
  clue,
  index,
  isUnlocked,
  onClose,
}: {
  clue: Clue;
  index: number;
  isUnlocked: boolean;
  onClose: () => void;
}) {
  return (
    <div className="cb-detail">
      <div className="cb-detail__scanlines" />

      {/* Header row */}
      <div className="cb-detail__top">
        <div className="cb-detail__img-wrap">
          <img
            src={`/clues/clue_${index + 1}.png`}
            alt={clue.name}
            className="cb-detail__img"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0";
            }}
          />
        </div>

        <div className="cb-detail__meta">
          <span
            className="cb-detail__type-pill"
            style={{
              borderColor: SEVERITY_COLOR[clue.severity] ?? "#625111",
              color: SEVERITY_COLOR[clue.severity] ?? "#625111",
            }}
          >
            {getTypeLabel(clue.id)}
          </span>
          <h2 className="cb-detail__name">{clue.name}</h2>
          {clue.location && (
            <p className="cb-detail__location">
              <span className="cb-detail__pin">📍</span> {clue.location}
            </p>
          )}
          {clue.severity === "major" && (
            <span className="cb-detail__key-badge">★ KEY EVIDENCE</span>
          )}
          {isUnlocked && (
            <span className="cb-detail__unlocked-badge">
              UNLOCKED VIA INVESTIGATION
            </span>
          )}
        </div>

        <button className="cb-detail__close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Dashed rule */}
      <div className="cb-detail__rule" />

      {/* Description */}
      <p className="cb-detail__desc">{clue.description}</p>

      {/* Suspects */}
      {clue.couldImplicateSuspects && clue.couldImplicateSuspects.length > 0 && (
        <div className="cb-detail__suspects">
          <p className="cb-detail__suspects-label">COULD IMPLICATE</p>
          <div className="cb-detail__suspect-tags">
            {clue.couldImplicateSuspects.map((name) => (
              <span key={name} className="cb-detail__suspect-tag">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* File stamp */}
      <div className="cb-detail__stamp">
        EVIDENCE FILE #{String(index + 1).padStart(3, "0")}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function ClueBook() {
  const { player } = useGameStore();
  const notificationClues = useNotificationStore((s) => s.clues);
  const clues: Clue[] = notificationClues.length > 0 ? notificationClues : (player?.clues ?? []);
  const navigate = useNavigate();

  const [selected, setSelected] = useState<Clue | null>(null);
  const [examined, setExamined] = useState<Set<string>>(new Set());

  // Which clues were unlocked via minigames
  const unlockedIds = useNotificationStore((s) =>
    new Set(s.clues.filter((c) => c.discovered).map((c) => c.id))
  );
  const visibleClues = clues.filter((clue) => clue.discovered);

  const handleClick = (clue: Clue) => {
    setSelected(clue);
    setExamined((prev) => new Set(prev).add(clue.id));
  };

  const examinedCount = examined.size;
  const totalCount = visibleClues.length;
  const unlockedCount = unlockedIds.size;

  return (
    <div className="cb-overlay">
      <div className="cb-book">
        {/* Pixel corners */}
        <div className="cb-corner cb-corner--tl" />
        <div className="cb-corner cb-corner--tr" />
        <div className="cb-corner cb-corner--bl" />
        <div className="cb-corner cb-corner--br" />

        {/* ── Header ── */}
        <header className="cb-header">
          <div className="cb-header__left">
            <div className="cb-header__rule" />
            <h1 className="cb-header__title">EVIDENCE</h1>
            <div className="cb-header__rule" />
          </div>
          <div className="cb-header__stats">
            <div className="cb-stat">
              <span className="cb-stat__num">{examinedCount}</span>
              <span className="cb-stat__label">EXAMINED</span>
            </div>
            <div className="cb-stat__divider" />
            <div className="cb-stat">
              <span className="cb-stat__num">{totalCount}</span>
              <span className="cb-stat__label">TOTAL</span>
            </div>
            {unlockedCount > 0 && (
              <>
                <div className="cb-stat__divider" />
                <div className="cb-stat cb-stat--unlocked">
                  <span className="cb-stat__num">{unlockedCount}</span>
                  <span className="cb-stat__label">UNLOCKED</span>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="cb-header__underline" />

        {/* ── Body ── */}
        <div className="cb-body">
          {/* Left: clue grid */}
          <div className="cb-grid">
            {visibleClues.length === 0 ? (
              <div className="cb-empty">
                <span className="cb-empty__icon">?</span>
                <span className="cb-empty__text">NO CLUES UNLOCKED YET</span>
              </div>
            ) : (
              visibleClues.slice(0, 6).map((clue, i) => (
                <ClueCard
                  key={clue.id}
                  clue={clue}
                  index={i}
                  isSelected={selected?.id === clue.id}
                  isExamined={examined.has(clue.id)}
                  isUnlocked={unlockedIds.has(clue.id)}
                  onClick={() => handleClick(clue)}
                />
              ))
            )}
          </div>

          {/* Right: detail */}
          <div className="cb-detail-col">
            {selected ? (
              <ClueDetail
                clue={selected}
                index={visibleClues.findIndex((c) => c.id === selected.id)}
                isUnlocked={unlockedIds.has(selected.id)}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="cb-detail cb-detail--empty">
                <div className="cb-detail__scanlines" />
                <span className="cb-detail__empty-icon">?</span>
                <span className="cb-detail__empty-text">
                  SELECT A CLUE TO EXAMINE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer nav ── */}
        <div className="cb-footer">
          <button className="cb-btn" onClick={() => navigate("/desk")}>
            ← BACK TO DESK
          </button>
          <button className="cb-btn" onClick={() => navigate("/interrogate")}>
            → INTERROGATION ROOM
          </button>
        </div>
      </div>
    </div>
  );
}