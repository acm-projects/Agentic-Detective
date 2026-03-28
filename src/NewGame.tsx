import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import { useNavigate } from 'react-router';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList';
import { FaSave } from "react-icons/fa";

function NewGame() {
  const setSeed = useGameStore((s) => s.setSeed);
  const startCase = useGameStore((s) => s.startCase);
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [personalization, setPersonalization] = useState('');
    const [timePeriod, setTimePeriod] = useState(10);
    const [intensity, setIntensity] = useState(5);
    const [difficulty, setDifficulty] = useState(5);
    const [isMuted, setIsMuted] = useState(false);

    const { userId, isSignedIn } = useAuth();


    // Setup background music on mount
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = 0.3;

        const startAudio = () => {
            audio.play().catch(err => console.log('Audio playback failed:', err));
            document.removeEventListener('click', startAudio); // Only trigger once
        };

        // Try immediately (works if user navigated here via a click)
        audio.play().catch(() => {
            // Autoplay blocked — wait for first interaction
            document.addEventListener('click', startAudio);
        });

        return () => {
            document.removeEventListener('click', startAudio);
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    // Handle mute/unmute
    const toggleMute = () => {
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
            setIsMuted(!isMuted);
        }
    };

    const playClickSound = () => {
      const audio = new Audio('../assets/Graphic_Pulse.mp3');
      audio.play();
    }

    return (
      <div className="container">
      <audio
        ref={audioRef}
        src="/assets/mondamusic-spy-detective-robbery-music-491671.mp3"
        loop
      />
      <header>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="detective-button" style={{ marginRight: '10px' }}>Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="detective-button">Sign Up</button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          Hello, 
          <UserButton userProfileMode="modal" showName> 
            <UserButton.UserProfilePage
              label="Your Saved Games"
              url="testpage"
              labelIcon={<FaSave style={{
                fontSize: '1rem',
                marginBottom: '0.25rem',
                verticalAlign: 'middle'
              }}/>}
            >
              <SavedGamesList />
            </UserButton.UserProfilePage>
          </UserButton>
        </Show>
      </header>
      
      <h1 className="title">Agentic Detective</h1>
      <p className="subtitle">Welcome to the game you create for yourself!</p>
      <button
        onClick={toggleMute}
        className="detective-button"
        style={{ marginBottom: '20px', maxWidth: '250px' }}
      >
        {isMuted ? 'Unmute Music' : 'Mute Music'}
      </button>
      <input
        type="text"
        value={personalization}
        onChange={(e) => setPersonalization(e.target.value)}
        placeholder="Personalize your gameplay..."
        className="input"
      />
      <div className="slider-container">
        <label className="label">
          Time Period: {timePeriod} mins
        </label>
        <input
          type="range"
          min="5"
          max="90"
          step="5"
          value={timePeriod}
          onChange={(e) => setTimePeriod(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="slider-container">
        <label className="label">
          Intensity: {intensity}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="slider-container">
        <label className="label">Difficulty: {difficulty}</label>
        <input
          type="range"
          min="1" 
          max="10" 
          step="1"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="slider"
        />
      </div>
        <button className="detective-button" onClick={()=>{
          playClickSound();
          setSeed({
            freeText: personalization,        // "1920s jazz club", "remote Antarctic base", etc
            difficulty: difficulty,  // 1–10 slider ("on a scale of 1 to 10")
            duration: timePeriod,     // minutes: 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60
            intensity: intensity,
            userId: userId ?? undefined, // cross check whether this should be undefined or ""
            isSignedIn: isSignedIn ? true : false,
          }) 
          startCase(navigate); // check for userId here
          navigate('/desk');
        }} >
        SOLVE! 
      </button>
    </div>
    );
}

export default NewGame;