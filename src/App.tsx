import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Message from './desk/DeskMessage.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import Suspects from './Suspects.tsx';
import './App.css';
import { useGameStore } from './useGameStore';
import CaseReportScreen from './CaseReportScreen.tsx';
import Interrogate from "./Interrogate";
import NotesPage from './NotesPage.tsx';

function App() {
  async function getData(){
    const caseId = localStorage.getItem("lastCaseId");
    if (!caseId) {
      console.log("[App] No lastCaseId in localStorage");
      return;
    }
    console.log("[App] Fetching case from MongoDB:", caseId);
    const response = await fetch(`http://localhost:3000/case/${caseId}`)
    console.log(response)
    const doc = await response.json();
    console.log(doc)
    console.log("[App] MongoDB returned:", doc);  // ← is doc null? missing fields?
    if (!doc || doc.error) {
      console.warn("[App] Bad response from MongoDB:", doc);
      return;
    }
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

  })
}


  useEffect(() => {
    const { player } = useGameStore.getState();
    if (player) {
      console.log("[App] Zustand already has player, skipping fetch");
      return;
    }
  
    const caseId = localStorage.getItem("lastCaseId");
    if (!caseId) {
      console.log("[App] No lastCaseId in localStorage");
      return;
    }
    console.log("[App] Fetching case from MongoDB:", caseId);
    getData();
  }, []);

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/desk" element={<Message />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/investigate" element={<NotesPage />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/interrogate" element={<Interrogate />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/suspects" element={<Suspects />} />
    </Routes>
    </>
  )
}

export default App;