import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress } from './useGameStore';
import { StressBar } from './StressBar';
import { useNotificationStore } from './store/useNotificationStore'
import { useNotificationScheduler } from './services/useNotificationScheduler'
import { NotificationToast } from './components/notifications/NotificationToast'
import { MinigameModal } from './components/minigames/MinigameModal'
import { AudioContext } from './App';
import { Show, SignInButton, SignUpButton, UserButton, useClerk } from '@clerk/react-router';
import './Interrogate.css';

// ✅ IMPORT YOUR GIF
import blinkingPortraitGirl from './assets/blinkingportraitgirl.gif';

// ✅ MAP (so it still works with avatarId system)
const avatarMap: Record<string, string> = {
  default: blinkingPortraitGirl,
};

interface AttachedClue {
  id: string;
  name: string;
  description: string;
  location: string;
  couldImplicateSuspects?: string | string[];
}

function useDraggableModal(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - offset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { pos, onMouseDown };
}

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
  const [showNotebook, setShowNotebook] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stressLevel = useActiveSuspectStress();
  const { isMuted, setIsMuted } = useContext(AudioContext);

  // ── Evidence / clue state ──────────────────────────────
  const allClues = useNotificationStore(s => s.clues);
  const discoveredClues = allClues.filter(c => c.discovered);
  const [cluesModalOpen, setCluesModalOpen] = useState(false);
  const [attachedClues, setAttachedClues] = useState<AttachedClue[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { pos, onMouseDown } = useDraggableModal({ x: window.innerWidth - 340, y: 120 });

  const timerPaused = useNotificationStore(s => s.timerPaused);

  useEffect(() => {
    console.log("got into useEffect1")
    console.log(activeSuspectName, " ", profiles)
    if (profiles.length === 0) return;

    const hasValidActiveSuspect =
      !!activeSuspectName && profiles.some(p => p.name === activeSuspectName);

    if (!hasValidActiveSuspect) {
      startInterrogation(profiles[0].name);
      console.log("1st useEffect inside if")
    }
  }, [activeSuspectName, profiles, startInterrogation]);

  useEffect(() => {
    if (timerPaused) return;
    const id = setInterval(tickElapsed, 1000);
    return () => clearInterval(id);
  }, [timerPaused, player]);

  useNotificationScheduler(elapsed, 600_000, !!player);

  useEffect(() => {
    console.log("got into useEffect2")
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSuspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    startInterrogation(e.target.value);
    setInput('');
    setAttachedClues([]);
  };

  // ── Drop zone handlers ─────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/clue');
    if (!raw) return;
    try {
      const clue: AttachedClue = JSON.parse(raw);
      setAttachedClues(prev =>
        prev.find(c => c.id === clue.id) ? prev : [...prev, clue]
      );
    } catch {
      console.warn('Could not parse dropped clue data');
    }
  };

  const getImplicatingSuspects = (clue: AttachedClue): string[] => {
    if (Array.isArray(clue.couldImplicateSuspects)) return clue.couldImplicateSuspects;
    if (typeof clue.couldImplicateSuspects === 'string')
      return clue.couldImplicateSuspects.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  const clueImplicatesCurrent = (clue: AttachedClue) =>
    getImplicatingSuspects(clue).some(
      s => s.toLowerCase() === activeSuspectName?.toLowerCase()
    );

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && attachedClues.length === 0) || isResponding) return;

    const typedText = input.trim();
    const cluesForDisplay = attachedClues.map(c => ({ id: c.id, name: c.name }));

    let llmText = typedText;
    if (attachedClues.length > 0) {
      const evidenceBlock = attachedClues
        .map(clue => {
          const implicating = clueImplicatesCurrent(clue);
          return [
            `[EVIDENCE PRESENTED: "${clue.name}"]`,
            `  Location found: ${clue.location}`,
            `  Details: ${clue.description}`,
            implicating
              ? `  ⚠️ This evidence directly implicates you. React with significantly elevated stress and defensiveness.`
              : `  This evidence has been shown to you.`,
          ].join('\n');
        })
        .join('\n\n');

      llmText = typedText
        ? `${evidenceBlock}\n\nDetective says: "${typedText}"`
        : `${evidenceBlock}\n\n[The detective slides the evidence across the table without saying a word.]`;
    }

    setInput('');
    setAttachedClues([]);
    await sendMessage(llmText, typedText, cluesForDisplay);
  }

  const handleConfirmSignOut = async () => {
    (document.getElementById('signout-warning') as HTMLDialogElement)?.close();
    await signOut();
    localStorage.removeItem("lastSessionId");
    localStorage.removeItem("lastCaseId");
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
    console.log("No case generated yet")
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
            {/* ✅ Mute toggle from music branch */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
              <input type="checkbox" checked={isMuted} onChange={e => setIsMuted(e.target.checked)} />
              Mute Music
            </label>
            <menu className="dialog-menu">
              <button>Nah</button>
              <button><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>

        {/* ✅ Suspects nav from music branch */}
        <button onClick={() => navigate("/suspects")}><span> ← </span>Suspects</button>

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

        {/* ✅ Evidence locker toggle from music branch */}
        <button
          className={`evidence-nav-btn ${cluesModalOpen ? 'active' : ''}`}
          onClick={() => setCluesModalOpen(p => !p)}
        >
          🔍 Evidence {discoveredClues.length > 0 && `(${discoveredClues.length})`}
        </button>
      </div>

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container">
        <div className='case-title' />
        <div className='header-row'> {/* check this later. */}
            {/* Interrogation: suspectname title; check if it works if there is no active profile */}
            <div className='currently-interrogating-container'>
                <h1>INTERROGATING: {activeProfile?.name.toUpperCase()}</h1>
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
            {/* ✅ Main branch avatar (gif avatarMap) */}
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
                        <div className='player-message'>
                          <strong className='you-text'>You: </strong>
                          {/* ✅ Clue chips in chat history from music branch */}
                          {msg.displayClues && msg.displayClues.length > 0 && (
                            <div className="chat-clue-chips">
                              {msg.displayClues.map((c: { id: string; name: string }) => (
                                <span key={c.id} className="chat-clue-chip">🔍 {c.name}</span>
                              ))}
                            </div>
                          )}
                          {msg.displayText && <span>{msg.displayText}</span>}
                          {/* Fallback for older history entries without displayText */}
                          {!msg.displayText && !msg.displayClues?.length && <span>{msg.text}</span>}
                        </div>
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

                {/* ✅ Drop zone + clue chips + input from music branch */}
                <div
                  className={`question-submit-box ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {attachedClues.length > 0 && (
                    <div className="clue-chips-bar">
                      {attachedClues.map(clue => {
                        const implicates = clueImplicatesCurrent(clue);
                        return (
                          <span
                            key={clue.id}
                            className={`clue-chip ${implicates ? 'clue-chip--implicating' : ''}`}
                            title={clue.description}
                          >
                            {implicates ? '⚠️' : '🔍'} {clue.name}
                            <button
                              type="button"
                              className="clue-chip-remove"
                              onClick={() =>
                                setAttachedClues(prev => prev.filter(c => c.id !== clue.id))
                              }
                            >✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {isDragOver && (
                    <div className="drop-hint">Drop clue to present as evidence</div>
                  )}

                  <div className='question-box'>
                    <input
                      type="text"
                      placeholder={
                        attachedClues.length > 0
                          ? 'Add a question, or send silently…'
                          : 'Ask questions here...'
                      }
                      value={input}
                      disabled={isResponding}
                      onChange={e => setInput(e.target.value)}
                    />
                  </div>
                  <div className='submit-button'>
                    <button
                      type='submit'
                      disabled={isResponding || (!input.trim() && attachedClues.length === 0)}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* ✅ Main branch notes window (clickable notebook modal trigger) */}
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

      {/* ✅ Main branch notebook modal */}
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

      {/* ✅ Draggable Evidence Locker Modal from music branch */}
      {cluesModalOpen && (
        <div
          className="clue-modal"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="clue-modal-handle" onMouseDown={onMouseDown}>
            <span className="clue-modal-title">LOCKER</span>
            <div className="clue-modal-handle-dots">
              <span /><span /><span /><span /><span /><span />
            </div>
            <button
              className="clue-modal-close"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setCluesModalOpen(false)}
            >✕</button>
          </div>

          <p className="clue-modal-hint">Drag a card to the chat to present evidence</p>

          <div className="clue-modal-body">
            {discoveredClues.length === 0 ? (
              <p className="clue-modal-empty">No clues discovered yet.</p>
            ) : (
              discoveredClues.map((clue, i) => {
                const suspects = Array.isArray(clue.couldImplicateSuspects)
                  ? clue.couldImplicateSuspects
                  : typeof clue.couldImplicateSuspects === 'string'
                  ? (clue.couldImplicateSuspects as string).split(',').map(s => s.trim())
                  : [];
                const implicatesCurrent = suspects.some(
                  s => s.toLowerCase() === activeSuspectName?.toLowerCase()
                );
                const alreadyAttached = attachedClues.some(c => c.id === clue.id);

                return (
                  <div
                    key={clue.id}
                    draggable={!alreadyAttached}
                    onDragStart={e => {
                      e.dataTransfer.setData('application/clue', JSON.stringify({
                        id: clue.id,
                        name: clue.name,
                        description: clue.description,
                        location: clue.location,
                        couldImplicateSuspects: clue.couldImplicateSuspects,
                      }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={[
                      'clue-modal-card',
                      implicatesCurrent ? 'clue-modal-card--implicating' : '',
                      alreadyAttached   ? 'clue-modal-card--attached'    : '',
                    ].join(' ')}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="clue-modal-card-icon">
                      <img src={`/clues/clue_${(i % 6) + 1}.png`} alt="" />
                    </div>
                    <div className="clue-modal-card-info">
                      <div className="clue-modal-card-name">
                        {implicatesCurrent && <span className="implicates-badge">!</span>}
                        {clue.name}
                      </div>
                      <div className="clue-modal-card-location">📍 {clue.location}</div>
                    </div>
                    {alreadyAttached
                      ? <span className="clue-modal-card-added">ADDED</span>
                      : <span className="clue-modal-card-drag-hint">⠿</span>
                    }
                  </div>
                );
              })
            )}
          </div>

          <div className="clue-modal-footer">
            <span>FOUND <b>{discoveredClues.length}</b> / {allClues.length}</span>
            <span>ATTACHED <b>{attachedClues.length}</b></span>
          </div>
        </div>
      )}

      <NotificationToast />
      <MinigameModal />
    </div>
  );
}

export default Interrogate;
