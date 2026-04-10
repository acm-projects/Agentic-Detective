import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import { useNavigate } from 'react-router';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react-router';
import SavedGamesList from './components/savegamelist/SavedGamesList';
import { FaSave, FaUsers } from "react-icons/fa";
import detectivePhoto from './assets/detective.png';
import loadingImage from './assets/loadingimage.png';
import Community from './Community';

const TIP_EXAMPLES = [
  "You can find your saved games through your \"Manage Account\" page!",
  "Remember to collect as many clues as you can in order to make an informed decision!",
  "Remember, you can only accuse once. If you get it wrong, it's game over.",
  "If you wish to save your game, remember to sign in to pick-up where you left off!",
  "Pay close attention during interrogations — suspects don't always tell the whole truth.",
  "Contradictions between suspect statements are often your biggest breakthroughs.",
  "Don't rush to accuse. Gather every clue before you point the finger.",
  "Revisit earlier clues after each interrogation — new context can change everything.",
  "Some clues only become relevant once you've spoken to the right suspect.",
  "A solid alibi isn't always airtight. Look for the cracks.",
  "Take note of who knew whom before the crime — motive is just as important as opportunity.",
  "When in doubt, interrogate again. Suspects may reveal more as pressure builds.",
] as const;

const PROMPT_EXAMPLES = [
  "a chicken farmer",
  "an evil scientist from Danville",
  "a tractor operator",
  "a racing champion",
  "a woman that loved cats",
  "a person that loves cookies",
  "a woman that loves play-doh",
  "the owner of a world-renowned casino",
  "the manager of a bank heist crew",
  "a university professor with very harsh grading",
  "a k-pop idol that had a falling-out with their record label",
  "a water bottle technician",
  "a lawyer from a New York-based law firm who never went to law school but has photographic memory",
  "a meth cook from Albuquerque with a chemistry teacher background",
  "a Serbian war veteran who arrives in New York by boat for revenge",
  "a detective at the 99th precinct in Brooklyn",
  "an insufferable phycisist from Pasadena and his group of friends"
] as const;

const INTENSITY_OPTIONS = [
  { label: 'G', value: 2, className: 'g' },
  { label: 'PG-13', value: 5, className: 'pg13' },
  { label: 'R', value: 9, className: 'r' },
] as const;

const DURATION_OPTIONS = [
  { label: 'Short', value: 5, className: 'short' },
  { label: 'Medium', value: 15, className: 'medium' },
  { label: 'Long', value: 30, className: 'long' }
] as const;

function NewGame() {
  const setSeed = useGameStore((s) => s.setSeed);
  const startCase = useGameStore((s) => s.startCase);
  const clearLoadedCase = useGameStore((s) => s.clearLoadedCase);
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

  const [personalization, setPersonalization] = useState('');
  const [timePeriod, setTimePeriod] = useState<5 | 15 | 30>(15);
  const [intensity, setIntensity] = useState<2 | 5 | 9>(5);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [isMuted, setIsMuted] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [promptExampleShown, setPromptExampleShown] = useState(false);
  const [promptExample, setPromptExample] = useState("");

  const { userId, isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
      clearLoadedCase();
    }, [clearLoadedCase]);

    // Add code to assign prompt example to a variable
    useEffect(() => {
      if (promptExampleShown) return;

      const randomIndex = Math.floor(Math.random() * PROMPT_EXAMPLES.length);
      setPromptExample(PROMPT_EXAMPLES[randomIndex]);
      setPromptExampleShown(true);
    }, [!promptExampleShown])

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
    <div className="newgame-screen">
    <div className="container newgame-container">
      <audio
        ref={audioRef}
        src="/assets/mondamusic-spy-detective-robbery-music-491671.mp3"
        loop
      />

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

              <p className="saved-games-hint">
                Sign in, open Manage Account, then select Your Saved Games to continue a case.
              </p>
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

              <p className="saved-games-hint">
                Need to load a previous case? Open Manage Account and choose Your Saved Games.
              </p>
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
              placeholder={
                `Personalize your gameplay here!` + '\n'
                + `For example, I want to play a game about` + ` ${promptExample}...`
              }
              className="input"
              style={{
                fontSize: "14px",
              }}
            />
          </div>

          <div className="slider-container">
            <label className="label">
              Gameplay Duration: {DURATION_OPTIONS.find((option) => option.value === timePeriod)?.label} ({DURATION_OPTIONS.find((option) => option.value === timePeriod)?.value})
            </label>
            <div className='duration-toggle' role="group" aria-label="Duration selector">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`duration-option ${timePeriod === option.value ? 'active' : ''} ${option.className}`}
                  onClick={() => setTimePeriod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="slider-container">
            <label className="label">
              Intensity: {INTENSITY_OPTIONS.find((option) => option.value === intensity)?.label}
            </label>
            <div className="intensity-toggle" role="group" aria-label="Intensity selector">
              {INTENSITY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`intensity-option ${intensity === option.value ? 'active' : ''} ${option.className}`}
                  onClick={() => setIntensity(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="slider-container">
              <label className="label">
                Difficulty: {difficulty === 1 ? 'Easy' : difficulty === 2 ? 'Medium' : 'Hard'}
              </label>
              <div className="difficulty-toggle" role="group" aria-label="Difficulty selector">
                <button
                  type="button"
                  className={`difficulty-option ${difficulty === 1  ? 'active' : ''} ${difficulty === 1 ? 'easy' : ''}`}
                  onClick={() => setDifficulty(1)}
                >
                  Easy
                </button>
                <button
                  type="button"
                  className={`difficulty-option ${difficulty === 2 ? 'active' : ''} ${difficulty == 2 ? 'medium' : ''} `}
                  onClick={() => setDifficulty(2)}
                >
                  Medium
                </button>
                <button
                  type="button"
                  className={`difficulty-option ${difficulty === 3 ? 'active' : ''} ${difficulty === 3 ? 'hard' : ''}`}
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
                localStorage.removeItem('tutorialReadyAfterReport');
                localStorage.removeItem('tutorialDeskEntered');

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

                const startCasePromise = startCase(navigate);
                navigate('/desk');
                await startCasePromise;
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
      <br />

      <div className='tip-section'>
        <div className='tip-title'>
          Gameplay Tip:
        </div>
        <div className='tip-content'>
          <h6> {TIP_EXAMPLES[Math.floor(Math.random() * TIP_EXAMPLES.length)]}</h6>
        </div>
      </div>

      <div className="footer-strip">
        <p className="footer-text">Published Since 1887 · All Rights Reserved · Printed Daily Except Sundays & Public Holidays</p>
      </div>
    </div>
    </div>
    
    );



}

export default NewGame;