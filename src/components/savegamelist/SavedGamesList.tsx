import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import "./savegamelist.css";
import { useGameStore } from "../../useGameStore";

type SavedCase = {
  sessionId: string;
  status?: string;
  lastAutosavedAt?: string;
  game?: {
    phase?: string;
  };
  caseData?: {
    caseReport?: {
      caseTitle?: string;
    };
  };
};

type SavedGamesListProps = {
  onCaseSelected?: () => void;
};

async function fetchCasesFromUserId(userId: string): Promise<SavedCase[]> {
  const response = await fetch(`http://localhost:3000/cases/user/${userId}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as SavedCase[];
  return Array.isArray(data) ? data : [];
}

function SavedGameCard({
  game,
  onSelect,
  onSolve,
}: {
  game: SavedCase;
  onSelect: (game: SavedCase) => void;
  onSolve: () => void;
}) {
  const currentSessionId = useGameStore((s) => s.currentSessionId);
  const isSelected = currentSessionId === game.sessionId;

  const title = game.caseData?.caseReport?.caseTitle ?? "Untitled Case";
  const phase = game.status === "resolved" ? "resolved" : game.game?.phase ?? "unknown";
  const lastPlayed = game.lastAutosavedAt
    ? new Date(game.lastAutosavedAt).toLocaleString()
    : "Unknown";

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`saved-game-card ${isSelected ? "selected" : ""}`}
        onClick={() => onSelect(game)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(game);
          }
        }}
        aria-pressed={isSelected}
      >
        <h4 className={`card-title-text ${isSelected ? "selected" : ""}`}>{title}</h4>
        <p className="saved-game-meta">Game Phase: {phase}</p>
        <p className="saved-game-submeta">Last Played: {lastPlayed}</p>
        {isSelected && (
          <button 
            type="button" 
            className="card-solve-button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(game);
              onSolve();
            }}
            >Solve </button>
        )}
      </div>
    </li>

  );
}

function SavedGamesList({ onCaseSelected }: SavedGamesListProps) {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const setCurrentSessionId = useGameStore((s) => s.setCurrentSessionId);
  const setCurrentCaseDoc = useGameStore((s) => s.setSelectedCase);

  const [cases, setCases] = useState<SavedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      setCases([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedCases = await fetchCasesFromUserId(userId);
      const sortedCases = [...fetchedCases].sort((a, b) => {
        const aTime = a.lastAutosavedAt ? new Date(a.lastAutosavedAt).getTime() : 0;
        const bTime = b.lastAutosavedAt ? new Date(b.lastAutosavedAt).getTime() : 0;
        return bTime - aTime;
      });
      setCases(sortedCases);
    } catch (err) {
      console.error(err);
      setError("Failed to load saved games. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleSelectCase = (game: SavedCase) => {
    setCurrentSessionId(game.sessionId);
    setCurrentCaseDoc(game);
  };

  return (
    <section className="saved-games-panel" aria-label="Saved games">
      <div className="saved-games-header">
        <h3 className="title-text">Your Saved Games</h3>
        <button
          type="button"
          className="saved-games-refresh"
          onClick={loadCases}
          disabled={loading || !isSignedIn}
          aria-label="Refresh saved games"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {!isSignedIn && (
        <p className="saved-games-message" role="status">
          Sign in to view and load your saved games.
        </p>
      )}

      {isSignedIn && (
        <p className="saved-games-count" role="status" aria-live="polite">
          {loading ? "Loading saved games..." : `You have ${cases.length} saved games on record.`}
        </p>
      )}

      {error && (
        <p className="saved-games-error" role="alert">
          {error}
        </p>
      )}

      {isSignedIn && !loading && !error && cases.length === 0 && (
        <p className="saved-games-message" role="status">
          No saved games found yet.
        </p>
      )}

      {isSignedIn && cases.length > 0 && (
        <ul className="saved-games-list" aria-label="Saved game files">
          {cases.map((game) => (
            <SavedGameCard
              key={game.sessionId}
              game={game}
              onSelect={handleSelectCase}
              onSolve={() => onCaseSelected?.()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default SavedGamesList;