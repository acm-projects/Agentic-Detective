import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import { useNavigate } from 'react-router';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList';
import { FaSave, FaUsers } from "react-icons/fa";
import detectivePhoto from './assets/detective.png';
import loadingImage from './assets/2gary.png';
import Community from './Community';

function NewGame() {
  const setSeed = useGameStore((s) => s.setSeed);
  const startCase = useGameStore((s) => s.startCase);
  const clearLoadedCase = useGameStore((s) => s.clearLoadedCase);
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

  const [personalization, setPersonalization] = useState('');
  const [timePeriod, setTimePeriod] = useState(10);
  const [intensity, setIntensity] = useState(5);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [isMuted, setIsMuted] = useState(false);
    const [showCommunity, setShowCommunity] = useState(false);

  const { userId, isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
      clearLoadedCase();
    }, [clearLoadedCase]);


    // Setup background music on mount
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

    audio.volume = 0.3;

    const startAudio = () => {
      audio.play().catch(err => console.log('Audio playback failed:', err));
      document.removeEventListener('click', startAudio);
    };

    audio.play().catch(() => {
      document.addEventListener('click', startAudio);
    });

    return () => {
      document.removeEventListener('click', startAudio);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    console.log("User Sign in status: " + isSignedIn);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    localStorage.removeItem("lastSessionId");
    localStorage.removeItem("lastCaseId");
  }, [isSignedIn]);

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
  };

  return (
    <div className="container">
      <audio
        ref={audioRef}
        src="/assets/mondamusic-spy-detective-robbery-music-491671.mp3"
        loop
      />

      <div className="top-buttons">
        <button
          className="detective-button small-btn top-left-btn"
          onClick={() => {
            alert("Community coming soon");
          }}
        >
          COMMUNITY
        </button>

        <button
          onClick={toggleMute}
          className="detective-button small-btn top-right-btn"
        >
          {isMuted ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>

      <div className="top-rule"></div>

      <div className="newsletter-strip">
        <span className="newsletter-text"> - Daily Crimeletter - </span>
      </div>

      <h1 className="title">Agentic Detective</h1>
      <div className="title-divider"></div>

      <div className="subtitle">
        <span className="subtitle-side left">Vol. 1889</span>
        <span className="subtitle-text">Welcome to the game you create for yourself!</span>
        <span className="subtitle-side right">2¢</span>
      </div>

      <div className="content-row">
        <div className="photo-column">
          <div className="photo-box">
            <img
              src={detectivePhoto}
              alt="Detective"
              className="layered-photo"
            />
          </div>

          <div className="photo-caption">
            NEW DETECTIVE IN TOWN
          </div>

          <div className="auth-buttons">
            <Show when="signed-out">
              <div className="auth-button-row">
                <SignInButton mode="modal">
                  <button className="detective-button small-btn">Sign In</button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button className="detective-button small-btn">Sign Up</button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <div className="signed-in-panel">
                <div className="user-greeting">
                  Hello,&nbsp;
                  <UserButton userProfileMode="modal" showName>
                    <UserButton.UserProfilePage
                      label="Your Saved Games"
                      url="testpage"
                      labelIcon={
                        <FaSave
                          style={{
                            fontSize: '1rem',
                            marginBottom: '0.25rem',
                            verticalAlign: 'middle'
                          }}
                        />
                      }
                    >
                      <SavedGamesList />
                    </UserButton.UserProfilePage>
                  </UserButton>
                </div>
              </div>
            </Show>
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
        </div>

       

        <div className="controls-panel">
          <h2 className="section-heading">PERSONALIZE YOUR GAMEPLAY</h2>

          <div className="chat-row">
            <div className="chat-photo-placeholder">
              <img
                src={loadingImage}
                alt="Loading"
                className="layered-photo chat-layered-photo"
              />
            </div>

            <textarea
              value={personalization}
              onChange={(e) => setPersonalization(e.target.value)}
              placeholder="Personalize your gameplay..."
              className="input"
            />
          </div>

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

          <div className="solve-row">
            <button
              className="detective-button solve-button"
              onClick={async () => {
                playClickSound();

                // Fresh case should always re-run tutorial onboarding.
                localStorage.removeItem('tutorialSeen');
                localStorage.removeItem('tutorialStep');

                setSeed({
                  freeText: personalization,
                  difficulty: difficulty,
                  duration: timePeriod,
                  intensity: intensity,
                  userId: userId ?? undefined,
                  isSignedIn: isSignedIn ? true : false,
                });

                if (!isSignedIn) {
                  localStorage.removeItem("lastSessionId");
                  localStorage.removeItem("lastCaseId");
                  alert("Please enter a case theme before starting.");
                  return;
                }

                const isReloadFlow = await startCase(navigate);
                if (!isReloadFlow) {
                  navigate('/desk');
                }
              }}
            >
              SOLVE!
            </button>

      

      

            <button
              onClick={toggleMute}
              className="detective-button mute-button"
            >
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
        </div>
      </div>

      <div className="footer-strip">
        <p className="footer-text">Published Since 1887 · All Rights Reserved · Printed Daily Except Sundays & Public Holidays</p>
      </div>
    </div>
    
    );



}

export default NewGame;