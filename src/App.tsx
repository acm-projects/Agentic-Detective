import Interrogate from './Interrogate.tsx';
import { Routes, Route } from 'react-router-dom';
import Desk from './Desk.tsx';
import NewGame from './NewGame.tsx';
import './App.css';
import CaseReportScreen from './CaseReportScreen.tsx';

function App() {

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/desk" element={<Desk />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/interrogate" element={<Interrogate />} />
    </Routes>
    </>
  )
}

export default App;