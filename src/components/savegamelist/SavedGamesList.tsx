// This is a sub-page within the User Profile clerk modal
// This page fetches the user's saved games from MongoDB and displays them in a list
import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import './savegamelist.css'
import { useGameStore } from "../../useGameStore";

// ------------- Helper Functions -------------------
// 
async function fetchCasesFromUserId(userId: string) {
  console.log("imma go fetch that case endpoint")
  const response = await fetch(`http://localhost:3000/cases/user/${userId}`);
  const data = await response.json();
  return data;
}

// -------------- Sub-Components ---------------------
// The SavedGameCard function takes in required parameters (fed from SavedGamesList() component)
// and displays it in a summarized manner within the card
function SavedGameCard( {game} : {game: any} ) {
  const setCurrentSessionId = useGameStore((s) => s.setCurrentSessionId);
  const setCurrentCaseDoc = useGameStore((s) => s.setSelectedCase);
  const currentSessionId = useGameStore((s) => s.currentSessionId);
  const isSelected = currentSessionId === game?.sessionId;
  
  function handleSaveGamePress() {
    const sessionId = game?.sessionId;
    console.log("game file button pressed");
    console.log('Session id: ' + sessionId);
    console.log('Case title: ' + game?.caseData?.caseReport?.caseTitle);
    console.log(game?.caseData?.storyline?.trueSequenceOfEvents);
    console.log(game?.status);

    // Setting the session ID in the game state (this variable will be used to keep track of whether a case exists or not)
    // NOT going to use !userId as a checking condition as it can lead to conflicts
    setCurrentSessionId(sessionId);
    setCurrentCaseDoc(game);
    console.log("----------------------------------------------------------------");

    // call generateCaseFile and pass in the game as an argument
  }
  
  return (
    <div className={`saved-game-card ${isSelected ? "selected" : ""}`} onClick={handleSaveGamePress}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
        <span className={`card-title-text ${isSelected ? "selected" : ""}`}>{game?.caseData?.caseReport?.caseTitle}</span>
      </h4>
      <p style={{ color: '#f8fafc', margin: '0 0 4px 0', fontSize: '13px' }}>
        Game Phase: {game?.status === "resolved" ? "resolved" : game?.game?.phase}
      </p>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: '11px' }}>
        Last Played: {new Date(game?.lastAutosavedAt).toLocaleString()}
      </p>
    </div>
  )
}

// ---------------- Main Component --------------------
function SavedGamesList() {
  const { userId } = useAuth(); // use this user ID to fetch cases, store in array, loop thru contents of array to populate card
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // This useEffect fetches all cases of a user from MongoDB as soon as the component loads
  useEffect(() => {
    if (!userId) return;
    if (cases.length > 0) {
      setLoading(false);
      return;
    }

    fetchCasesFromUserId(userId)
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load saved games.');
        setLoading(false);
      });
  }, [userId, cases.length]);

  useEffect(() => {
    console.log("MOUNTED");
    return () => console.log("UNMOUNTED");
  }, []);


  return (
    <>
      <div className="user-stats">
        <h3 className="title-text">Your Saved Games</h3>
        <br />
            <p>You have {cases.length} saved games on record.</p>
          <p></p>
      </div>

      <div className="saved-games-list">
        {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}
        {error && <p style={{ color: '#ff6666' }}>{error}</p>}
        {!loading && cases.length === 0 && (
          <p style={{ color: '#94a3b8' }}>No saved games found.</p>
        )}
        {cases.map((c, i) => (
          <SavedGameCard key={c.sessionId ?? i} game={c} />
        ))}
      </div>
    </>
  )
}

export default SavedGamesList;