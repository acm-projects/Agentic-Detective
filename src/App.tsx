import { Routes, Route } from 'react-router-dom';
import Desk from './Desk.tsx';
import NewGame from './NewGame.tsx';
import './App.css';
import CaseReportScreen from './CaseReportScreen.tsx';
import Interrogate from "./Interrogate";
import NotesPage from './NotesPage.tsx';
import ClueBook from './ClueBook.tsx';

function App() {

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/desk" element={<Desk />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/investigate" element={<NotesPage />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/interrogate" element={<Interrogate />} />
    </Routes>
    </>
  )
}

export default App;