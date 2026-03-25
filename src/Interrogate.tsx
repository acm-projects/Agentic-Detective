import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore, useActiveHistory, useActiveSuspectProfile } from './useGameStore';
import './Interrogate.css';





function Interrogate() {
  const navigate = useNavigate();
  const {
    notes,
    player,
    backend,
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const setSuspectNote = useGameStore(state => state.setSuspectNote);
  const suspectNotes = useGameStore(state => state.notes.suspectNotes);

  // ── Auto-select first suspect ONLY when both player AND backend exist ──
  useEffect(() => {
    // Guard: do nothing if backend or profiles not ready yet
    if (!backend || !backend.suspects) return;
    if (!player || profiles.length === 0) return;
    if (activeSuspectName) return; // already selected

    startInterrogation(profiles[0].name);
  }, [backend, profiles.length, activeSuspectName]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);



  const handleSuspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!backend || !backend.suspects) return; // guard
    startInterrogation(e.target.value);
    setInput('');
  };

  useEffect(() => {

    const caseId = localStorage.getItem("lastCaseId");
    if(!activeSuspectName){
      console.log("[Interrogate Notes] Suspect name not found!")
      return
    }
  
    fetch(`http://localhost:3000/case/${caseId}/notes?suspectName=${encodeURIComponent(activeSuspectName)}`)
    .then(r => r.json())
    .then(data => {
      console.log("Fetched notes:", data);
      setNotes(data.suspectNotes || "");
    })
    .catch(err => console.warn("fetch failed:", err));
}, [activeSuspectName]);
        // Restore everything into Zustand BEFORE routes render
        useGameStore.setState((state) => ({
          ...state,
          caseData: {
            characterProfiles: doc.characterProfiles,
            caseReport: doc.caseReport,
            clues: doc.clues,
          },
          phase: doc.status === 'resolved' ? 'resolved' : 'investigation',
        }));
      })
      .catch(err => console.warn("Interrogate Notes] fetch failed:", err))
  }, []);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isResponding) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  }

  // ── No case at all ──
  if (!player) {
    return (
      <div className="interrogate-container">
        No active case. <Link to="/">Go Home</Link>
      </div>
    );
  }

  return (
    <div className='game-container'>
      {/* ── Nav bar ── */}
      <div className='navigate'>
        <button onClick={() => proceedToInvestigation(navigate)}>
          <span> ← </span>Notes
        </button>
        <button onClick={() => navigate("/clues")}>
          <span> ← </span>Clues
        </button>
        <button><span> ← </span>Files</button>
        <button className="back-btn" onClick={() => goToBriefing(navigate)}>
          Case Report
        </button>
        <button onClick={() => navigate('/desk')}> ← Desk</button>
        <button onClick={() =>
          (document.getElementById('settings') as HTMLDialogElement)?.showModal()
        }>
          <span> ← </span>Settings
        </button>
        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <menu className="dialog-menu">
              <button>Nah</button>
              <button><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>
        <button onClick={() => navigate("/suspects")}>
          <span> ← </span>Suspects
        </button>
        <button onClick={() =>
          (document.getElementById('accuse') as HTMLDialogElement)?.showModal()
        }>
          Accuse
        </button>
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

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container">
        <div className='case-title'>
          <h1>{player.caseReport.caseTitle}</h1>
        </div>

        <div className='currently-interrogating-container'>
          <h1>INTERROGATING: {activeProfile?.name?.toUpperCase() ?? '...'}</h1>
        </div>

        <div className='windows-container'>
          <div className='interrogation-window'>

            {/* Character card — only render when activeProfile exists */}
            {activeProfile ? (
              <div className='character-container'>
                <div className='character-avatar'>
                  <img
                    src={`/avatars/${activeProfile.avatarId}.png`}
                    alt={activeProfile.name}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p>Character Avatar goes here</p>
                </div>
                <div className='case-details'>
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
            ) : (
              <div className='character-container'>
                <p style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  Loading suspect…
                </p>
              </div>
            )}

            {/* Chat */}
            <div className='chatbot'>
              <form onSubmit={handleSendMessage} className="message-form">
                <div className='chat-history'>
                  {history.length === 0 && (
                    <p style={{ opacity: 0.5, fontStyle: 'italic' }}>
                      {activeProfile
                        ? `Begin questioning ${activeProfile.name}…`
                        : 'Loading suspect…'}
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
                      disabled={isResponding || !activeProfile}
                      onChange={e => setInput(e.target.value)}
                    />
                  </div>
                  <div className='submit-button'>
                    <button
                      type='submit'
                      disabled={isResponding || !input.trim() || !activeProfile}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className='notes-window'>
            <h1>Notes go here</h1>
            <p>
            {suspectNotes?.[activeSuspectName] || "No notes yet"}
            </p>
          </div>
        </div>

        {/* Suspect switcher */}
        <div className='suspect-switcher'>
          <form>
            <label htmlFor="suspects">
              <span className='switch-suspect-text'>Switch Suspect:</span>
            </label>
            <br />
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
