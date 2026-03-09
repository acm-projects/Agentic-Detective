import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGameStore,
  useActiveHistory,
  useActiveSuspectProfile,
} from './useGameStore';
import './Interrogate.css';
import { Link } from 'react-router';



interface NoteInterface{
  shown: boolean;
  content: string[];
}

function Interrogate() {
  const navigate = useNavigate();
  const {
    player,
    activeSuspectName,
    isResponding,
    startInterrogation,
    proceedToInvestigation,
    sendMessage,
    makeAccusation,
    goToBriefing,
  } = useGameStore();

  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];

  const [input, setInput] = useState('');
  const [activeCharacter, setActiveCharacter] = useState<CharacterData | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playClickSound = () => {
    const audio = new Audio('../assets/assets/viacheslavstarostin-mystery-detective-investigation-music-473843.mp3');
    audio.play();
  }

  useEffect(() => {
    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('../assets/HomeMusic.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser
      });
    }

    // Control audio based on muted state
    if (isMuted && audioRef.current) {
      audioRef.current.pause();
    } else if (!isMuted && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [isMuted]);
  //const [isNoteOpen, setIsNoteOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first suspect on the very first load 
  useEffect(() => {
    if (!activeSuspectName && profiles.length > 0) {
      startInterrogation(profiles[0].name);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSuspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    startInterrogation(e.target.value);
    setInput('');
  };

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isResponding) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  }

  // If no case has been generated yet, redirect home
  if (!player) {
    return (
      <div className="interrogate-container">
        No active case. <Link to="/">Go Home</Link>
      </div>
    </div>
  </div>
</div>
);
}

  return (
    <div className='game-container'>

      {/* ── Nav bar — matches original structure ── */}
      <div className='navigate'>
        <button onClick={() => {
          playClickSound();
          setIsMuted(!isMuted);
          }}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={() => {
          playClickSound()
          setIsNoteOpen(!isNoteOpen)}}>Notes</button>
        <button onClick={() => {
          playClickSound()
        }}>Clues</button>
        <button onClick={() => {
          playClickSound()
        }}>Files</button>
        <button onClick={() => {
          playClickSound();
          (document.getElementById('case-report') as HTMLDialogElement)?.showModal();
        }}>Case Report</button>
        <button onClick={() => proceedToInvestigation(navigate)}>Notes</button>
        <button onClick = {() => navigate("/clues")}>Clues</button>
        <button>Files</button>
        <button onClick={() => (document.getElementById('case-report') as HTMLDialogElement)?.showModal()}>Case Report</button>
        <dialog className="nes-dialog" id="case-report">
          <form method="dialog">
            <h3>Case Report</h3>
            <p>Case Report: {profile.name}'s Case File</p>
            <menu className="dialog-menu">
              <button>Close</button>
            </menu>
          </form>
        </dialog>
        <button onClick={playClickSound}><Link to="/desk">Desk</Link></button>
        <button onClick={() => {
          playClickSound();
          (document.getElementById('settings') as HTMLDialogElement)?.showModal();
        }}>Settings</button>
        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <p>Alert: this is a dialog.</p>
            <menu className="dialog-menu">
              <button onClick={playClickSound}>Nah</button>
              <button onClick={playClickSound}><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>
        </div>
        

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container">
        <h1>{player.caseReport.caseTitle}</h1>

        {/* Character card — same layout as original */}
        {activeProfile && (
          <div className='character-container'>
            <div className='mugshot'>
              <img
                src={`/avatars/${activeProfile.avatarId}.png`}
                alt={activeProfile.name}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className='stats'>
              <h2>{activeProfile.name}</h2>
              <h4>Age: {activeProfile.age}</h4>
              <h4>Occupation: {activeProfile.occupation}</h4>
              <h4>Relation: {activeProfile.relationshipToVictim}</h4>
              <h4>Claims: {activeProfile.claimedAlibi}</h4>
              <span className={`suspicion-tag suspicion-${activeProfile.suspicionLevel}`}>
                {activeProfile.suspicionLevel} suspicion
              </span>
            </div>
          
          </div>
        )}

        {/* Chat — matches original chatbot structure */}
        <div className='chatbot'>
          <form onSubmit={handleSendMessage} className="message-form">
            <h2>Interrogation</h2>

            <div className='chat-history'>
              {history.length === 0 && (
                <p style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  Begin questioning {activeProfile?.name}…
                </p>
              )}
              {history.map((msg, index) => (
                <div key={index} className='chat-message'>
                  {msg.role === 'player' ? (
                    <p className='player-message'>
                      <strong>You:</strong> {msg.text}
                    </p>
                  ) : (
                    <p className='bot-message'>
                      <strong>{activeProfile?.name}:</strong> {msg.text}
                    </p>
                  )}
                </div>
              ))}

              {isResponding && (
                <p className='bot-message' style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  <strong>{activeProfile?.name}:</strong> …
                </p>
              )}
              <div ref={chatEndRef} />
            </div>

            <input
              type="text"
              placeholder='Ask questions here...'
              value={input}
              disabled={isResponding}
              onChange={e => setInput(e.target.value)}
            />
            <button type='submit' onClick={playClickSound} disabled={isResponding || !input.trim()}>
              Submit
            </button>
          
          </form>
        </div>

        {/* Suspect switcher — same as original, driven by store profiles */}
        <div className='suspect-switcher'>
          <form>
            <label htmlFor="suspects">Switch Suspect: </label>
            <select
              onChange={handleSuspectChange}
              value={activeSuspectName ?? ''}
              name='suspects'
              id='suspects-list'
            >
              {profiles.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </form>
        </div>

      
      </div>
    </div>
  );
}

export default Interrogate;
