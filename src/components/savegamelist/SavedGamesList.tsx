// IMPORTANT: create a filtering feature to: filter based on isStarred, and phase; include sort mechanism
import { useCallback, useMemo, useState } from "react";
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

const HARD_CODED_SAVED_GAMES: SavedCase[] = [
  {
    sessionId: "CASE-0047",
    status: "resolved",
    lastAutosavedAt: "2026-04-17T01:55:18.000Z",
    game: { phase: "resolved" },
    caseData: { caseReport: { caseTitle: "The Closing Argument" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0046",
    status: "interrogation",
    lastAutosavedAt: "2026-04-14T02:55:57.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Perestroika Incident" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0045",
    status: "interrogation",
    lastAutosavedAt: "2026-04-13T17:17:27.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Radiator Springs Mystery" } },
    isStarred: true,
  },
  {
    sessionId: "CASE-0044",
    status: "interrogation",
    lastAutosavedAt: "2026-04-13T02:17:06.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Critic's Canvas" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0043",
    status: "briefing",
    lastAutosavedAt: "2026-04-12T17:22:43.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Leftorium Incident" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0042",
    status: "briefing",
    lastAutosavedAt: "2026-04-12T17:20:40.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Freezer Incident" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0041",
    status: "briefing",
    lastAutosavedAt: "2026-04-12T16:46:00.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Silence in Studio 4" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0040",
    status: "interrogation",
    lastAutosavedAt: "2026-04-12T02:22:50.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Garage Hangar Incident" } },
    isStarred: true,
  },
  {
    sessionId: "CASE-0039",
    status: "interrogation",
    lastAutosavedAt: "2026-04-08T13:23:52.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Acheron Depressurization" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0038",
    status: "interrogation",
    lastAutosavedAt: "2026-04-08T13:16:14.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Silence of Hangar 4" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0037",
    status: "briefing",
    lastAutosavedAt: "2026-04-08T01:08:22.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Short-Circuit Scandal" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0036",
    status: "resolved",
    lastAutosavedAt: "2026-04-08T00:37:39.000Z",
    game: { phase: "resolved" },
    caseData: { caseReport: { caseTitle: "The Final Verdict" } },
    isStarred: true,
  },
  {
    sessionId: "CASE-0035",
    status: "resolved",
    lastAutosavedAt: "2026-04-07T23:44:49.000Z",
    game: { phase: "resolved" },
    caseData: { caseReport: { caseTitle: "The Last Lecture" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0034",
    status: "interrogation",
    lastAutosavedAt: "2026-04-07T02:59:16.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Leftorium Tragedy" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0033",
    status: "briefing",
    lastAutosavedAt: "2026-04-07T02:11:27.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Tailor's Silence" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0032",
    status: "interrogation",
    lastAutosavedAt: "2026-04-07T01:59:39.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Radiator Springs Sabotage" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0031",
    status: "resolved",
    lastAutosavedAt: "2026-04-07T01:57:38.000Z",
    game: { phase: "resolved" },
    caseData: { caseReport: { caseTitle: "The Royal Poisoning" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0030",
    status: "interrogation",
    lastAutosavedAt: "2026-04-07T01:36:32.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Purrfect Sip Tragedy" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0029",
    status: "interrogation",
    lastAutosavedAt: "2026-04-06T16:35:30.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Radioactive Glaze Incident" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0028",
    status: "briefing",
    lastAutosavedAt: "2026-04-06T16:27:14.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Hutt's Last Breath" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0027",
    status: "briefing",
    lastAutosavedAt: "2026-04-06T01:42:55.000Z",
    game: { phase: "briefing" },
    caseData: { caseReport: { caseTitle: "The Abyss Silence" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0026",
    status: "interrogation",
    lastAutosavedAt: "2026-04-06T00:27:54.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Abyssal Silence" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0025",
    status: "interrogation",
    lastAutosavedAt: "2026-04-05T14:33:34.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Critic's Demise" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0024",
    status: "interrogation",
    lastAutosavedAt: "2026-04-05T13:50:08.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Case of the Silent Engine" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0023",
    status: "interrogation",
    lastAutosavedAt: "2026-04-05T13:48:58.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Case of the Fallen Champion" } },
    isStarred: true,
  },
  {
    sessionId: "CASE-0022",
    status: "interrogation",
    lastAutosavedAt: "2026-04-05T02:53:35.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Case of the Purr-loined Fortune" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0021",
    status: "interrogation",
    lastAutosavedAt: "2026-04-05T00:24:09.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Case of the Poisoned Purr" } },
    isStarred: false,
  },
  {
    sessionId: "CASE-0020",
    status: "interrogation",
    lastAutosavedAt: "2026-04-04T18:12:10.000Z",
    game: { phase: "interrogation" },
    caseData: { caseReport: { caseTitle: "The Case of the Canine Calamity" } },
    isStarred: false,
  },
];

function cloneHardcodedSavedGames(): SavedCase[] {
  return HARD_CODED_SAVED_GAMES.map((game) => ({
    ...game,
    game: game.game ? { ...game.game } : undefined,
    caseData: game.caseData
      ? {
          ...game.caseData,
          caseReport: game.caseData.caseReport ? { ...game.caseData.caseReport } : undefined,
        }
      : undefined,
  }));
}

function SavedGameCard({
  game,
  onSelect,
  onSolve,
  onStarChange,
}: {
  game: SavedCase;
  onSelect: (game: SavedCase) => void;
  onSolve: (game: SavedCase) => void | Promise<void>;
  onStarChange: (sessionId: string, isStarred: boolean) => void;
}) {
  const currentSessionId = useGameStore((s) => s.currentSessionId);
  const isSelected = currentSessionId === game.sessionId;
  const [isStarring, setIsStarring] = useState(false);
  const isStarred = game.isStarred ?? false;

  const title = game.caseData?.caseReport?.caseTitle ?? "Untitled Case";
  const phase = game.status === "resolved" ? "resolved" : game.game?.phase ?? "unknown";
  const lastPlayed = game.lastAutosavedAt
    ? new Date(game.lastAutosavedAt).toLocaleString()
    : "Unknown";

  const handleStarClick = async (game: SavedCase) => {
    if (isStarring) return;
    const newStarred = !isStarred;
    setIsStarring(true);
    onStarChange(game.sessionId, newStarred);
    setIsStarring(false);
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
  const setCurrentSessionId = useGameStore((s) => s.setCurrentSessionId);
  const setCurrentCaseDoc = useGameStore((s) => s.setSelectedCase);

  const [cases, setCases] = useState<SavedCase[]>(() => cloneHardcodedSavedGames());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterStarred, setFilterStarred] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("lastPlayed-desc");

  const loadCases = useCallback(() => {
    setLoading(true);
    setError(null);
    setCases(cloneHardcodedSavedGames());
    setLoading(false);
  }, []);

  const handleStarChange = useCallback((sessionId: string, isStarred: boolean) => {
    setCases((currentCases) =>
      currentCases.map((game) => (game.sessionId === sessionId ? { ...game, isStarred } : game)),
    );
  }, []);

  const handleSelectCase = (game: SavedCase) => {
    setCurrentSessionId(game.sessionId);
    setCurrentCaseDoc(game);
  };

  const handleSolveCase = async (game: SavedCase) => {
    handleSelectCase(game);
    await onSolveCase?.(game);
    onCaseSelected?.();
  };

  const filteredAndSortedCases = useMemo(() => {
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
          disabled={loading}
          aria-label="Refresh saved games"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className="saved-games-count" role="status" aria-live="polite">
        {loading ? "Loading saved games..." : `You have ${cases.length} saved games on record.`}
      </p>

      {cases.length > 0 && (
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

      {!loading && !error && cases.length === 0 && (
        <p className="saved-games-message" role="status">
          No saved games found yet.
        </p>
      )}
      {cases.length > 0 && (
        <>
          {filteredAndSortedCases.length === 0 ? (
            <p className="saved-games-message" role="status">
              No games match your filters.
            </p>
          ) : (
            <ul className="saved-games-list" aria-label="Saved game files">
              {filteredAndSortedCases.map((game) => (
                <SavedGameCard
                  key={game.sessionId}
                  game={game}
                  onSelect={handleSelectCase}
                  onSolve={handleSolveCase}
                  onStarChange={handleStarChange}
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