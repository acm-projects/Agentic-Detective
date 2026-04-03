import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import { useNavigate } from 'react-router';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList';
import { FaSave, FaUsers } from "react-icons/fa";
import Community from './Community';

function NewGame() {
  const setSeed = useGameStore((s) => s.setSeed);
  const startCase = useGameStore((s) => s.startCase);
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [personalization, setPersonalization] = useState('');
    const [timePeriod, setTimePeriod] = useState(10);
    const [intensity, setIntensity] = useState(5);
    const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
    const [isMuted, setIsMuted] = useState(false);
    const [showCommunity, setShowCommunity] = useState(false);

    const { userId, isSignedIn, isLoaded } = useAuth();


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

    useEffect(() => {
      console.log("User Sign in status: " + isSignedIn)
    }, [isLoaded]);
    // Removing previous Session ID data after signout
    useEffect(() => {
      localStorage.removeItem("lastSessionId");
      localStorage.removeItem("lastCaseId");
    }, [!isSignedIn]);

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
        <label className="label">
          Difficulty: {difficulty === 1 ? 'Easy' : difficulty === 2 ? 'Medium' : 'Hard'}
        </label>
        <div className="difficulty-toggle" role="group" aria-label="Difficulty selector">
          <button
            type="button"
            className={`difficulty-option ${difficulty === 1 ? 'active' : ''}`}
            onClick={() => setDifficulty(1)}
          >
            Easy
          </button>
          <button
            type="button"
            className={`difficulty-option ${difficulty === 2 ? 'active' : ''}`}
            onClick={() => setDifficulty(2)}
          >
            Medium
          </button>
          <button
            type="button"
            className={`difficulty-option ${difficulty === 3 ? 'active' : ''}`}
            onClick={() => setDifficulty(3)}
          >
            Hard
          </button>
        </div>
      </div>
        <button className="detective-button" onClick={()=>{
          playClickSound();
          setSeed({
            freeText: personalization,        // "1920s jazz club", "remote Antarctic base", etc
            difficulty: difficulty,  // 1 = Easy, 2 = Medium, 3 = Hard
            duration: timePeriod,     // minutes: 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60
            intensity: intensity,
            userId: userId ?? undefined, // cross check whether this should be undefined or ""
            isSignedIn: isSignedIn ? true : false,
          })
          if (!isSignedIn) {
            localStorage.removeItem("lastSessionId");
            localStorage.removeItem("lastCaseId");
            alert("Please enter a case theme before starting.");
            return;
          }
          startCase(navigate); // check for userId here
          navigate('/desk');
        }} >
        SOLVE! 
      </button>

      {/* Community Button - Bottom Left */}
      <button
        onClick={() => setShowCommunity(true)}
        className="community-button"
        title="View Community"
      >
        <FaUsers /> Community
      </button>

      {/* Community Modal */}
      <dialog 
        className="community-modal"
        open={showCommunity}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCommunity(false);
          }
        }}
      >
        <div className="community-modal-content">
          <button
            className="community-modal-close"
            onClick={() => setShowCommunity(false)}
            aria-label="Close community modal"
          >
            ✕
          </button>
          <Community onCloseModal={() => setShowCommunity(false)} />
        </div>
      </dialog>
    </div>
    );



}

export default NewGame;