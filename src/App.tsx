import { Routes, Route, useNavigate } from 'react-router';
import Message from './desk/DeskMessage.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import Suspects from './Suspects.tsx';
import './App.css';
import CaseReportScreen from './CaseReportScreen.tsx';
import Interrogate from "./Interrogate";
import NotesPage from './NotesPage.tsx';
import Accuse from './Accuse.tsx';
import { SignIn, SignUp, UserProfile } from '@clerk/react-router';

function UserProfilePage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1rem' }}>
      <button
        className="detective-button"
        onClick={() => navigate('/')}
        style={{ 
          marginBottom: '1rem', 
          marginLeft: '1rem', 
          backgroundColor: 'white' 
          }}
      >
        Back to Game
      </button>
      <UserProfile />

    </div>
  );
}

function SignInPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1rem' }}>
      <SignIn />
      <br/>
      <button
        className="detective-button"
        onClick={() => navigate('/')} 
        style={{ 
          marginBottom: '1rem', 
          marginLeft: '0.5rem', 
          backgroundColor: 'white',
          alignItems: 'center',
          alignSelf: 'center',
          fontSize: '0.5rem'
          }}
      >
        Back to Game
        </button>
      </div>
  )
}

function SignUpPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1rem' }}>
      <SignUp />
      <br/>
      <button
        className="detective-button"
        onClick={() => navigate('/')} 
        style={{ 
          marginBottom: '1rem', 
          marginLeft: '0.5rem', 
          backgroundColor: 'white',
          alignItems: 'center',
          alignSelf: 'center',
          fontSize: '0.5rem'
          }}
      >
        Back to Game
        </button>
      </div>
  )
}

function App() {

  return (<>
    <Routes>
      <Route path="/" element={<NewGame />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/user-profile/*" element={<UserProfilePage />} />
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