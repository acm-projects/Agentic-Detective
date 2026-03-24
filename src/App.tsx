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
import Accuse from './Accuse.tsx';
import { SignIn, SignUp, UserProfile } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList.tsx';





function App() {

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/sign-in/*" element={<SignIn />} />
      <Route path="/sign-up/*" element={<SignUp />} />
      <Route path="/user-profile/*" element={
        <UserProfile> 
          <UserProfile.Page 
          label="Your Saved Games" 
          url="testpage" 
          labelIcon={<span>🕵️</span>}>
            <SavedGamesList />
          </UserProfile.Page>
        </UserProfile>
        } />
      <Route path="/desk" element={<Message />} />
      <Route path="/report" element={<CaseReportScreen />} />
      <Route path="/investigate" element={<NotesPage />} />
      <Route path="/clues" element={<ClueBook />} />
      <Route path="/interrogate" element={<Interrogate />} />
      <Route path="/suspects" element={<Suspects />} />
      <Route path="/accuse" element={<Accuse />} />
    </Routes>
    </>
  )
}

export default App;