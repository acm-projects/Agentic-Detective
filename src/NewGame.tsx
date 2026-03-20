import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import { useNavigate } from 'react-router';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react-router';

function NewGame() {
    const { setSeed, startCase } = useGameStore();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [personalization, setPersonalization] = useState('');
    const [timePeriod, setTimePeriod] = useState(10); // Default value
    const [intensity, setIntensity] = useState(5); // Default value
    const [difficulty, setDifficulty] = useState(5); // Default value
    const [isMuted, setIsMuted] = useState(false);

    const { userId, sessionId, isSignedIn } = useAuth();
    console.log("User Id:", userId);
    console.log("Session Id:", sessionId);
    console.log("Is Signed In:", isSignedIn);


    // Setup background music on mount
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = 0.3; // Set volume to 30%
            audio.play().catch(err => console.log('Audio playback failed:', err));
        }

        return () => {
            // Cleanup: stop music when component unmounts
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
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
      const audio = new Audio('../assets/Graphic_Pulse.mp3'); // Ensure you have a click sound at this path
      audio.play();
    }

    return (
      <div className="container">
      <audio
        ref={audioRef}
        src="/assets/9jackjack8-the-triple-move-adventure-spy-jazz-409674.mp3"
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
          <UserButton userProfileMode="modal" showName />
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
            userId: userId ?? undefined,
            sessionId: sessionId ?? undefined,
            isSignedIn: isSignedIn ? true : false,
          }) 
          startCase(navigate);
          navigate('/desk');
        }} >
        SOLVE! 
      </button>
    </div>
    );
}

export default NewGame;