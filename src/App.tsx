import { useState, useEffect, useRef, createContext } from 'react';
import mainMp3 from '../assets/main.mp3';
import { Routes, Route, useLocation } from 'react-router';
import Message from './desk/DeskMessage.tsx';
import NewGame from './NewGame.tsx';
import ClueBook from './ClueBook.tsx';
import './App.css';
import CaseReportScreen from './CaseReportScreen.tsx';
import LoadingScreen from './LoadingScreen.tsx';
import Interrogate from "./Interrogate";
import Accuse from './Accuse.tsx';
import Suspects from './Suspects.tsx';
import CaseResolvedErrorScreen from './components/caseResolvedScreen/CaseResolvedErrorScreen.tsx';
import { SignIn, SignUp, UserProfile } from '@clerk/react-router';

export const AudioContext = createContext<{
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
}>({ isMuted: false, setIsMuted: () => {} });

function AppInner() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const location = useLocation();
  const isSilentPage = location.pathname === '/' || location.pathname === '/loading' || location.pathname === '/accuse';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isSilentPage) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const tryPlay = () => {
      audio.play().catch(() => {});
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };

    audio.play().catch(() => {
      window.addEventListener('click', tryPlay);
      window.addEventListener('keydown', tryPlay);
    });
  }, [isSilentPage]);

  useEffect(() => {
    if (isSilentPage) {
      audioRef.current?.pause();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onReady = () => { if (!isSilentPage) setIsMuted(false); };
    audio.addEventListener('canplaythrough', onReady, { once: true });
    return () => audio.removeEventListener('canplaythrough', onReady);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, setIsMuted }}>
      <audio ref={audioRef} src={mainMp3} loop />
      <Routes>
        <Route path="/" element={<NewGame />} />
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="/sign-in/*" element={<SignIn />} />
        <Route path="/sign-up/*" element={<SignUp />} />
        <Route path="/user-profile/*" element={<UserProfile />} />
        <Route path="/desk" element={<Message />} />
        <Route path="/report" element={<CaseReportScreen />} />
        <Route path="/clues" element={<ClueBook />} />
        <Route path="/interrogate" element={<Interrogate />} />
        <Route path="/accuse" element={<Accuse />} />
        <Route path="/suspects" element={<Suspects />} />
        <Route path="/case-already-resolved-error" element={<CaseResolvedErrorScreen />} />
      </Routes>
    </AudioContext.Provider>
  );
}

function App() {
  return <AppInner />;
}

export default App;