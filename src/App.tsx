import Interrogate from './Interrogate.tsx';
import { Routes, Route } from 'react-router-dom';
import Message from './desk/DeskMessage.tsx';
import CaseReportScreen from './CaseReportScreen.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import Suspects from './Suspects.tsx';
import './App.css';

function App() {

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/desk" element={<Message />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/interrogate" element={<Interrogate />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/suspects" element={<Suspects />} />
    </Routes>
    </>
  )
}

export default App;