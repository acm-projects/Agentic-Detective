import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore, useActiveHistory, useActiveSuspectProfile } from './useGameStore';
import './Interrogate.css';

function Interrogate() {
  const navigate = useNavigate();
  const { player, activeSuspectName, isResponding, startInterrogation, proceedToInvestigation, sendMessage, makeAccusation, goToBriefing } = useGameStore();
  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];
  const [input, setInput] = useState('');
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
    );
  }

  return (
    <div className='game-container'>
      {/* ── Nav bar — matches original structure ── */}
      <div className='navigate'>
        <button onClick={() => proceedToInvestigation(navigate)}>Notes</button>
        <button onClick = {() => navigate("/clues")}>Clues</button>
        <button>Files</button>
        {/*<button onClick={() =>
          (document.getElementById('case-report') as HTMLDialogElement)?.showModal()
        }>
          Case Report
        </button>
       <dialog className="nes-dialog" id="case-report">
          <form method="dialog">
            <h3>Case Report</h3>
            <p><strong>{player.caseReport.caseTitle}</strong></p>
            <p>{player.caseReport.officialBriefing}</p>
            <menu className="dialog-menu">
              <button>Close</button>
            </menu>
          </form>
        </dialog> */}
        <button className="back-btn" onClick={() =>goToBriefing(navigate)}>Case Report</button>
        <button><Link to="/desk">Desk</Link></button>
        <button onClick={() =>
          (document.getElementById('settings') as HTMLDialogElement)?.showModal()
        }>Settings</button>
        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <menu className="dialog-menu">
              <button>Nah</button>
              <button><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>
        <button onClick={() => goToBriefing(navigate)}> <span> ← </span> Case File</button>
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

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container">
        <div className='case-title'>
          <h1 style = {{}}>{player.caseReport.caseTitle}</h1>
        </div>

        {/* Interrogation: suspectname title; check if it works if there is no active profile */}
        <div className='currently-interrogating-container'>
            <h1>INTERROGATING: {activeProfile?.name.toUpperCase()}</h1>
        </div>

        <div className='windows-container'>
          <div className='interrogation-window'>
            {/* Character card — same layout as original */}
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
            )}

            {/* Chat — matches original chatbot structure */}
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

          <div className='notes-window'>
            <h1> Notes go here </h1>
          </div>
        </div>

        {/* Suspect switcher — same as original, driven by store profiles */}
        <div className='suspect-switcher'>
          <form>
            <label style={{}} htmlFor="suspects">Switch Suspect: </label>
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