import { Routes, Route } from 'react-router';
import Message from './desk/DeskMessage.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import Suspects from './Suspects.tsx';
import CluesPageTest from './components/cluesPage/CluesPageTest.tsx';
import './App.css';
import CaseReportScreen from './CaseReportScreen.tsx';
import Interrogate from "./Interrogate";
import NotesPage from './NotesPage.tsx';
import Accuse from './Accuse.tsx';

function App() {

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
      <Route path="/clues2" element={<CluesPageTest />} />
      <Route path="/accuse" element={<Accuse />} />
    </Routes>
    </>
  )
}

export default App;