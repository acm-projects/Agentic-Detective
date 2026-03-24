// This is a sub-page within the User Profile clerk modal
// This page fetches the user's saved games from MongoDB and displays them in a list
import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import './savegamelist.css'

// The SavedGameCard function takes in required parameters (fed from SavedGamesList() component)
// and displays it in a summarized manner within the card


function SavedGameCard( {game} : {game: any} ) {
  function handleSaveGamePress() {
    console.log("game file button pressed");
  }
  
  return (
    <div className="saved-game-card" onClick={handleSaveGamePress}>
          <h4 style={{ color: '#ff6666', margin: '0 0 8px 0', fontSize: '14px' }}>
            {game?.caseData?.caseReport?.caseTitle}
          </h4>
          <p style={{ color: '#f8fafc', margin: '0 0 4px 0', fontSize: '13px' }}>
            Game Phase: {game?.status === "resolved" ? "resolved" : game?.game?.phase}
            </p>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '11px' }}>
            Last Played: { new Date(game?.lastAutosavedAt).toLocaleString() }
          </p>
      </div>
  )
}

// 
async function fetchCases(userId: string) {
  const response = await fetch(`http://localhost:3000/case/user/${userId}`);
  const data = await response.json();
  return data;
}


function SavedGamesList() {
  const { userId } = useAuth(); // use this user ID to fetch cases, store in array, loop thru contents of array to populate card
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numCases, setNumCases] = useState(0);


  // This useEffect fetches all cases of a user from MongoDB as soon as the component loads
  useEffect(() => {
    if (!userId) return;

    fetchCases(userId)
      .then(data => {
        setCases(data);
        setLoading(false);
        setNumCases(data.length);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load saved games.');
        setLoading(false);
      });
  }, [userId]);

  console.log(cases);
  console.log(numCases);
  console.log(userId);

  return (
    <>
      <div className="user-stats">
        <h3 className="title-text">Your Saved Games</h3>
        <br />
          <p>You have {numCases} saved games on record.</p>
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