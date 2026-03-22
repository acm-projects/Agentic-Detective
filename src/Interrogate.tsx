import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore, useActiveHistory, useActiveSuspectProfile } from './useGameStore';
import './Interrogate.css';


function Interrogate() {
  const navigate = useNavigate();
  const { player, activeSuspectName, isResponding, startInterrogation, sendMessage, makeAccusation, goToBriefing } = useGameStore();
  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];
  const [input, setInput] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSuspectName && profiles.length > 0) {
      startInterrogation(profiles[0].name);
    }
  }, []);

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
        <button onClick={() => navigate("/clues")}><span> ← </span>Clues</button>
        <button className="nav-case-btn" onClick={() => goToBriefing(navigate)}>Case Report</button>
        <button><Link to="/desk"><span> ← </span>Desk</Link></button>

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

        <button onClick={() => navigate("/suspects")}><span> ← </span>Suspects</button>

        <button onClick={() =>
          (document.getElementById('accuse') as HTMLDialogElement)?.showModal()
        }>Accuse</button>

        <dialog className="nes-dialog" id="accuse">
          <form method="dialog">
            <h3>Make Your Accusation</h3>
            <p>Who do you think did it?</p>
            {profiles.map(p => (
              <button key={p.name} onClick={() => makeAccusation(p.name)}>
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
                    src={`/avatars/${activeProfile.avatarId}.png`}
                    alt={activeProfile.name}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="avatar-overlay" />
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

          {/* ── Clickable notebook (invisible, sits over bg image) ── */}
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

      {/* ── Notebook / Suspect Details Modal ── */}
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
                      src={`/avatars/${activeProfile.avatarId}.png`}
                      alt={activeProfile.name}
                      className="notebook-suspect-avatar"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
    </div>
  );
}

export default Interrogate;