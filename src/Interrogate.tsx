import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress } from './useGameStore';
import { StressBar } from './StressBar';
import { useNotificationStore } from './store/useNotificationStore'
import { useNotificationScheduler } from './services/useNotificationScheduler'
import { NotificationToast } from './components/notifications/NotificationToast'
import { MinigameModal } from './components/minigames/MinigameModal'
import './Interrogate.css';

// ✅ IMPORT YOUR GIF
import blinkingPortraitGirl from './assets/blinkingportraitgirl.gif';

// ✅ MAP (so it still works with avatarId system)
const avatarMap: Record<string, string> = {
  default: blinkingPortraitGirl,
};

function Interrogate() {
  const navigate = useNavigate();
  const { 
    player, activeSuspectName, isResponding, elapsed,
    startInterrogation, proceedToInvestigation, sendMessage, 
    makeAccusation, goToBriefing, tickElapsed,
  } = useGameStore();

  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];
  const [input, setInput] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stressLevel = useActiveSuspectStress();

  useEffect(() => {
    if (!activeSuspectName && profiles.length > 0) {
      startInterrogation(profiles[0].name);
    }
  }, []);

  const timerPaused = useNotificationStore(s => s.timerPaused)

  useEffect(() => {
    if (timerPaused) return
    const id = setInterval(tickElapsed, 1000)
    return () => clearInterval(id)
  }, [timerPaused, player])

  useNotificationScheduler(elapsed, 600_000, !!player)

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

  if (!player) {
    return (
      <div className="interrogate-container">
        No active case. <Link to="/">Go Home</Link>
      </div>
    );
  }

  return (
    <div className='game-container'>
      <div className='navigate'>
        <button onClick={() => proceedToInvestigation(navigate)}><span> ← </span>Notes</button>
        <button onClick={() => navigate("/clues")}><span> ← </span>Clues</button>

        <button className="nav-case-btn" onClick={() => goToBriefing(navigate)}>Case Report</button>
        <button onClick={() => navigate("/desk")}><span> ← </span>Desk</button>

        <button onClick={() =>
          (document.getElementById('settings') as HTMLDialogElement)?.showModal()
        }><span> ← </span>Settings</button>

        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <menu className="dialog-menu">
              <button>Nah</button>
              <button><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>

        <button onClick={() =>
          (document.getElementById('accuse') as HTMLDialogElement)?.showModal()
        }>Accuse</button>

        <dialog className="nes-dialog" id="accuse">
          <form method="dialog">
            <h3>Make Your Accusation</h3>
            <p>Who do you think did it?</p>
            {profiles.map(p => (
              <button key={p.name} onClick={() => makeAccusation(p.name, navigate)}>
                {p.name}
              </button>
            ))}
            <menu className="dialog-menu">
              <button>Cancel</button>
            </menu>
          </form>
        </dialog>
      </div>

      <div className="interrogate-container">
        <div className='case-title' />

        <div className='currently-interrogating-container'>
          <h1>INTERROGATING: {activeProfile?.name.toUpperCase()}</h1>
        </div>

        <div className='windows-container'>
          <div className='interrogation-window'>
            {activeProfile && (
              <div className='character-container'>
                <div className='character-avatar'>
                  <img
                    src={avatarMap[activeProfile.avatarId] || avatarMap.default}
                    alt={activeProfile.name}
                  />
                  <div className="avatar-overlay" />
                  <StressBar level={stressLevel} />
                </div>
              </div>
            )}

            <div className='chatbot'>
              <form onSubmit={handleSendMessage} className="message-form">
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
                          <strong className='you-text'>You: </strong> {msg.text}
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

                <div className='question-submit-box'>
                  <div className='question-box'>
                    <input
                      type="text"
                      placeholder='Ask questions here...'
                      value={input}
                      disabled={isResponding}
                      onChange={e => setInput(e.target.value)}
                    />
                  </div>
                  <div className='submit-button'>
                    <button type='submit' disabled={isResponding || !input.trim()}>
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className='notes-window' onClick={() => setShowNotebook(true)} />
        </div>

        <div className='suspect-switcher'>
          <form>
            <label htmlFor="suspects"><span className='switch-suspect-text'>Switch Suspect:</span></label>
            <br />
            <select
              onChange={handleSuspectChange}
              value={activeSuspectName ?? ''}
              name='suspects'
              id='suspects-list'
            >
              {profiles.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </form>
        </div>
      </div>

      {showNotebook && (
        <div className="notebook-modal-overlay" onClick={() => setShowNotebook(false)}>
          <div className="notebook-modal" onClick={e => e.stopPropagation()}>
            <button className="notebook-modal-close" onClick={() => setShowNotebook(false)}>✕</button>
            <h2 className="notebook-modal-title">SUSPECT PROFILE</h2>
            <div className="notebook-modal-list">
              {activeProfile && (
                <div className="notebook-suspect-card">
                  <div className="notebook-suspect-header">
                    <img
                      src={avatarMap[activeProfile.avatarId] || avatarMap.default}
                      alt={activeProfile.name}
                      className="notebook-suspect-avatar"
                    />
                    <div>
                      <div className="notebook-suspect-name">{activeProfile.name}</div>
                      <div className="notebook-suspect-meta">{activeProfile.age} · {activeProfile.occupation}</div>
                      <div className={`notebook-suspicion-tag suspicion-${activeProfile.suspicionLevel}`}>
                        {activeProfile.suspicionLevel.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="notebook-suspect-divider" />
                  <div className="notebook-suspect-field"><span>Relation:</span> {activeProfile.relationshipToVictim}</div>
                  <div className="notebook-suspect-field"><span>Alibi:</span> {activeProfile.claimedAlibi}</div>
                  <div className="notebook-suspect-field"><span>Notes:</span> {activeProfile.personalityBlurb}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <NotificationToast />
      <MinigameModal />
    </div>
  );
}

export default Interrogate;