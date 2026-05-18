// IMPORTANT: create a filtering feature to: filter based on isStarred, and phase; include sort mechanism
import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import "./savegamelist.css";
import { useGameStore } from "../../useGameStore";
import { CiStar } from "react-icons/ci";

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
  isStarred: boolean;
};

type SavedGamesListProps = {
  onCaseSelected?: () => void;
  onSolveCase?: (game: SavedCase) => void | Promise<void>;
};

async function fetchCasesFromUserId(userId: string): Promise<SavedCase[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cases/user/${userId}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as SavedCase[];

  return Array.isArray(data) ? data : [];
}

function SavedGameCard({
  game,
  userId,
  onSelect,
  onSolve,
}: {
  game: SavedCase;
  userId: string;
  onSelect: (game: SavedCase) => void;
  onSolve: (game: SavedCase) => void | Promise<void>;
}) {
  const currentSessionId = useGameStore((s) => s.currentSessionId);
  const isSelected = currentSessionId === game.sessionId;
  const [isStarred, setIsStarred] = useState(game.isStarred ?? false);
  const [isStarring, setIsStarring] = useState(false);

  const title = game.caseData?.caseReport?.caseTitle ?? "Untitled Case";
  const phase = game.status === "resolved" ? "resolved" : game.game?.phase ?? "unknown";
  const lastPlayed = game.lastAutosavedAt
    ? new Date(game.lastAutosavedAt).toLocaleString()
    : "Unknown";

  const handleStarClick = async (game: SavedCase) => {
    if (isStarring) return;
    const newStarred = !isStarred;
    setIsStarred(newStarred); // optimistic update
    setIsStarring(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cases/${game.sessionId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isStarred: newStarred }),
      });
      if (!response.ok) {
        throw new Error(`Star request failed: ${response.status}`);
      }
      game.isStarred = newStarred;
    } catch (err) {
      console.error("Failed to persist star:", err);
      setIsStarred(!newStarred); // roll back on failure
    } finally {
      setIsStarring(false);
    }
  };


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
        <div className="card-top-section">

          <div className="card-stats">
            <h4 className={`card-title-text ${isSelected ? "selected" : ""}`}>{title}</h4>
            <p className="saved-game-meta">Game Phase: {phase}</p>
            <p className="saved-game-submeta">Last Played: {lastPlayed}</p>
          </div>

          <div className="card-star-section">
            <button 
              className= {`card-star-button ${isStarred ? "starred" : ""}`} 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleStarClick(game); 
              }}
              disabled={isStarring}
              aria-label={isStarred ? "Unstar this case" : "Star this case"}
              aria-pressed={isStarred}
            > 
              <CiStar /> 
            </button>
          </div>
        </div>

        <div className="card-bottom-section">
          {isSelected && (
            <button 
              type="button" 
              className="card-solve-button"
              onClick={async (e) => {
                e.stopPropagation();
                onSelect(game);
                await onSolve(game);
                }}
              >Solve </button>
          )}
        </div>
      </div>
    </li>

  );
}

function SavedGamesList({ onCaseSelected, onSolveCase }: SavedGamesListProps) {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const setCurrentSessionId = useGameStore((s) => s.setCurrentSessionId);
  const setCurrentCaseDoc = useGameStore((s) => s.setSelectedCase);

  const [cases, setCases] = useState<SavedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterStarred, setFilterStarred] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("lastPlayed-desc");

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

  const handleSolveCase = async (game: SavedCase) => {
    handleSelectCase(game);
    await onSolveCase?.(game);
    onCaseSelected?.();
  };

  const filterAndSortCases = useCallback(() => {
    let filtered = [...cases];

    // Apply phase filter
    if (filterPhase !== "all") {
      filtered = filtered.filter((game) => {
        const phase = game.status === "resolved" ? "resolved" : game.game?.phase ?? "unknown";
        return phase.toLowerCase() === filterPhase.toLowerCase();
      });
    }


    // Apply starred filter
    if (filterStarred === "starred") {
      filtered = filtered.filter((game) => game.isStarred);
    } else if (filterStarred === "unstarred") {
      filtered = filtered.filter((game) => !game.isStarred);
    }

    // Apply sort
    if (sortBy === "lastPlayed-asc") {
      filtered.sort((a, b) => {
        const aTime = a.lastAutosavedAt ? new Date(a.lastAutosavedAt).getTime() : 0;
        const bTime = b.lastAutosavedAt ? new Date(b.lastAutosavedAt).getTime() : 0;
        return aTime - bTime;
      });
    } else if (sortBy === "lastPlayed-desc") {
      filtered.sort((a, b) => {
        const aTime = a.lastAutosavedAt ? new Date(a.lastAutosavedAt).getTime() : 0;
        const bTime = b.lastAutosavedAt ? new Date(b.lastAutosavedAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (sortBy === "phase-asc") {
      filtered.sort((a, b) => {
        const aPhase = a.status === "resolved" ? "resolved" : a.game?.phase ?? "unknown";
        const bPhase = b.status === "resolved" ? "resolved" : b.game?.phase ?? "unknown";
        return aPhase.localeCompare(bPhase);
      });
    } else if (sortBy === "phase-desc") {
      filtered.sort((a, b) => {
        const aPhase = a.status === "resolved" ? "resolved" : a.game?.phase ?? "unknown";
        const bPhase = b.status === "resolved" ? "resolved" : b.game?.phase ?? "unknown";
        return bPhase.localeCompare(aPhase);
      });
    } else if (sortBy === "starred-first") {
      filtered.sort((a, b) => {
        if (a.isStarred === b.isStarred) return 0;
        return a.isStarred ? -1 : 1;
      });
    }

    return filtered;
  }, [cases, filterPhase, filterStarred, sortBy]);

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

      {isSignedIn && cases.length > 0 && (
        <div className="filter-sort-section">
          <div className="filter-sort-group">
            <label className="filter-sort-label">Phase:</label>
            <select
              className="filter-sort-select"
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
            >
              <option value="all">All Phases</option>
              {/* {<option value="setup">Setup</option>
              <option value="generating">Generating</option>
              <option value="refreshed">Refreshed</option>} */}
              <option value="briefing">Briefing</option>
              <option value="interrogation">Interrogation</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* {<div className="filter-sort-group">
            <label className="filter-sort-label">Status:</label>
            <select
              className="filter-sort-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="resolved">Resolved</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>} */}

          <div className="filter-sort-group">
            <label className="filter-sort-label">Starred:</label>
            <select
              className="filter-sort-select"
              value={filterStarred}
              onChange={(e) => setFilterStarred(e.target.value)}
            >
              <option value="all">All</option>
              <option value="starred">Starred Only</option>
              <option value="unstarred">Unstarred Only</option>
            </select>
          </div>

          <div className="filter-sort-group">
            <label className="filter-sort-label">Sort By:</label>
            <select
              className="filter-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="lastPlayed-desc">Last Played (Newest First)</option>
              <option value="lastPlayed-asc">Last Played (Oldest First)</option>
              <option value="phase-asc">Phase (A-Z)</option>
              <option value="phase-desc">Phase (Z-A)</option>
              <option value="starred-first">Starred First</option>
            </select>
          </div>
        </div>
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
        <>
          {filterAndSortCases().length === 0 ? (
            <p className="saved-games-message" role="status">
              No games match your filters.
            </p>
          ) : (
            <ul className="saved-games-list" aria-label="Saved game files">
              {filterAndSortCases().map((game) => (
                <SavedGameCard
                  key={game.sessionId}
                  game={game}
                  userId={userId ?? ""}
                  onSelect={handleSelectCase}
                  onSolve={handleSolveCase}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default SavedGamesList;