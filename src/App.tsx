import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Message from './desk/DeskMessage.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import Suspects from './Suspects.tsx';
import './App.css';
import { useGameStore } from './useGameStore';
import CaseReportScreen from './CaseReportScreen.tsx';
import Interrogate from "./Interrogate";
import NotesPage from './NotesPage.tsx';
import Accuse from './Accuse.tsx';
import CaseResolvedErrorScreen from './components/CaseResolvedErrorScreen.tsx';
import { SignIn, SignUp, UserProfile } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList.tsx';





function App() {
  const [isRestoring, setIsRestoring] = useState(() => {
    // Only show restoring screen if there's actually a saved case to load
    return !!localStorage.getItem("lastCaseId");
  });

  useEffect(() => {
    const { player } = useGameStore.getState();

    // Already have data — no need to fetch
    if (player) {
      setTimeout(() => setIsRestoring(false), 0);
      return;
    }

    const caseId = localStorage.getItem("lastCaseId");
    if (!caseId) {
      setTimeout(() => setIsRestoring(false), 0);
      return;
    }

    console.log("[App] Restoring case from MongoDB:", caseId);

    fetch(`http://localhost:3000/case/${caseId}`)
      .then(r => r.json())
      .then(doc => {
        console.log("[App] MongoDB returned:", doc);
        if (!doc || doc.error) {
          console.warn("[App] Bad response:", doc);
          return;
        }
        // Restore everything into Zustand BEFORE routes render
        useGameStore.setState({
          player: {
            characterProfiles: doc.characterProfiles,
            caseReport: doc.caseReport,
            clues: doc.clues,
          },
          backend: {
            storyline: doc.storyline,
            suspects: doc.suspects,
            clues: doc.clues,
          },
          phase: doc.status === 'resolved' ? 'resolved' : 'investigation',
        });
      })
      .catch(err => console.warn("[App] fetch failed:", err))
      .finally(() => setIsRestoring(false)); // always unblock
  }, []);

  // Block ALL routes from rendering until Zustand is populated
  if (isRestoring) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'monospace',
        background: '#0a0805',
        color: '#c8a464',
        fontSize: '14px',
        letterSpacing: '3px',
      }}>
        RESTORING SESSION…
      </div>
    );
  }


  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/sign-in/*" element={<SignIn />} />
      <Route path="/sign-up/*" element={<SignUp />} />
      <Route path="/user-profile/*" element={<UserProfile />} />
      <Route path="/desk" element={<Message />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/investigate" element={<NotesPage />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/interrogate" element={<Interrogate />} />
      <Route path="/suspects" element={<Suspects />} />
      <Route path="/accuse" element={<Accuse />} />
      <Route path="/case-already-resolved-error" element={<CaseResolvedErrorScreen />} />
    </Routes>
    </>
  )
}

export default App;