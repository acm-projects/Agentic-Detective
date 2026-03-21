import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress } from './useGameStore';
import { StressBar } from './StressBar';
import { useNotificationStore } from './store/useNotificationStore'
import { useNotificationScheduler } from './services/useNotificationScheduler'
import { NotificationToast } from './components/notifications/NotificationToast'
import { MinigameModal } from './components/minigames/MinigameModal'
import { Show, SignInButton, SignUpButton, UserButton, useClerk } from '@clerk/react-router';
import './Interrogate.css';



function Interrogate() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { 
    player, 
    activeSuspectName, 
    isResponding, 
    elapsed,
    startInterrogation, 
    proceedToInvestigation, 
    sendMessage, 
    makeAccusation, 
    goToBriefing,
    tickElapsed,
  } = useGameStore();

  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];
  const [input, setInput] = useState('');
  //const [isNoteOpen, setIsNoteOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stressLevel = useActiveSuspectStress();

  // Default to the first suspect whenever profiles become available.
  useEffect(() => {
    console.log("got into useEffect1")
    console.log(activeSuspectName, " ", profiles)
    if (!activeSuspectName && profiles.length > 0) {
    if (profiles.length === 0) return;

    const hasValidActiveSuspect =
      !!activeSuspectName && profiles.some(p => p.name === activeSuspectName);

    if (!hasValidActiveSuspect) {
      startInterrogation(profiles[0].name);
      console.log("1st useEffect inside if")
    }
  }, [activeSuspectName, profiles, startInterrogation]);

  // timer effect and scheduler
  const timerPaused = useNotificationStore(s => s.timerPaused)

  useEffect(() => {
    if (timerPaused) return
    const id = setInterval(tickElapsed, 1000)
    return () => clearInterval(id)
  }, [timerPaused, player])

  useNotificationScheduler(elapsed, 600_000, !!player)

  // Scroll to bottom on new messages
  useEffect(() => {
    console.log("got into useEffect2")
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

  const handleConfirmSignOut = async () => {
    (document.getElementById('signout-warning') as HTMLDialogElement)?.close();
    await signOut();
  };

  useEffect(() => {
    const handlePotentialSignOutClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Intercept Clerk's built-in sign-out actions in both popover and profile modal.
      const signOutTrigger = target.closest('button, a') as HTMLElement | null;
      if (!signOutTrigger) return;

      const label = signOutTrigger.textContent?.trim().toLowerCase() ?? '';
      if (!label.includes('sign out')) return;

      event.preventDefault();
      event.stopPropagation();
      (document.getElementById('signout-warning') as HTMLDialogElement)?.showModal();
    };

    document.addEventListener('click', handlePotentialSignOutClick, true);
    return () => document.removeEventListener('click', handlePotentialSignOutClick, true);
  }, []);

  // If no case has been generated yet, redirect home
  if (!player) {
     // Fetch saved history from MongoDB to restore context
  const caseId = player.caseReport.caseId;
  fetch(`http://localhost:3000/case/${caseId}`)
  .then(r => {
    if (!r.ok) {
      throw new Error(`Failed to fetch case data: ${r.statusText}`);
    }
    return r.json();
  })
    .then(doc => {
      const savedHistory: ChatMessage[] = doc.chatHistory?.[suspectName] ?? [];
      const chatSession = model.startChat({ history: [] });

      set(state => ({
        activeSuspectName: suspectName,
        sessions: {
          ...state.sessions,
          [suspectName]: {
            suspectName,
            chatSession,
            history: savedHistory, // ← restore from MongoDB
            conversationCount: savedHistory.length / 2,
          },
        },
      }));
    })
    .catch(err => {
      console.error("Error fetching case data:", err);
});


    console.log("No case generated yet")
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
        
        <button onClick={() => proceedToInvestigation(navigate)}><span> ← </span>Notes</button>
        <button onClick = {() => navigate("/clues")}><span> ← </span>Clues</button>
        <button><span> ← </span>Files</button>
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
        <button onClick={() => navigate("/suspects")}> <span> ← </span> Suspects</button>
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

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container">
        <div className='interrogate-subcontainer'>
          <div className='interrogate-subsubcontainer'>
            <div className='case-title'>
              <h1 style = {{}}>{player.caseReport.caseTitle}</h1>
            </div>

            {/* Interrogation: suspectname title; check if it works if there is no active profile */}
            <div className='currently-interrogating-container'>
                <h1>INTERROGATING: {activeProfile?.name.toUpperCase()}</h1>
            </div>
          </div>
          
          <div className='user-icon'>
            <Show when="signed-out">
              <div className="auth-actions">
                <SignInButton mode="modal">
                  <button className="user-button">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="user-button">Sign Up</button>
                </SignUpButton>
              </div>
            </Show>
            <Show when="signed-in">
              <div className="auth-actions auth-actions-signed-in">
                <span className="signed-in-greeting">Hello,</span>
                <UserButton userProfileMode="modal" showName appearance={{
                  options: {
                    shimmer: false,
                  }
                }}/>
              </div>
            </Show>
          </div>
          <dialog className="nes-dialog" id="signout-warning">
            <form method="dialog">
              <h3>Leave Account?</h3>
              <p>You are about to sign out from this device. Do you want to stay signed in or leave?</p>
              <p>You will lose all progress if you choose to sign out.</p>
              <menu className="dialog-menu">
                <button type="submit">Stay</button>
                <button type="button" onClick={handleConfirmSignOut}>Leave</button>
              </menu>
            </form>
          </dialog>
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
                    onError={e => {{
                      console.log(activeProfile.avatarId);
                    }
                      console.error("Failed to load image at:", (e.target as HTMLImageElement).src);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p>Character Avatar goes here</p>
                  {activeProfile && (
                    <div className='character-avatar'>
                      <img
                        src={`/avatars/${activeProfile.avatarId}.png`}
                        alt={activeProfile.name}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <StressBar level={stressLevel} />   {/* ← ADD */}
                    </div>
                  )}
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

          <div className='notes-window'>
            <h1> Notes go here </h1>
          </div>
        </div>

        {/* Suspect switcher — same as original, driven by store profiles */}
        <div className='suspect-switcher'>
          <form>
            <label style={{}} htmlFor="suspects"> <span className='switch-suspect-text'> Switch Suspect:</span> </label>
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
      <NotificationToast />
      <MinigameModal />
      </div>
  );
}

export default Interrogate;