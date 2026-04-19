import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress } from './useGameStore';
import { StressBar } from './StressBar';
import { useNotificationStore } from './store/useNotificationStore'
import { useNotificationScheduler } from './services/useNotificationScheduler'
import { NotificationToast } from './components/notifications/NotificationToast'
import { MinigameModal } from './components/minigames/MinigameModal'
import { AudioContext } from './App';
import { Show, UserButton, useClerk } from '@clerk/react-router';
import { Tooltip } from './components/tooltip/Tooltip';
import TutorialModal from './components/tutorial-modal/Tutorial';

import './Interrogate.css';
import SuspectPortrait from './components/SuspectPortrait'
import { useSpeechToText } from './services/speechToText.ts';

interface AttachedClue {
  id: string;
  name: string;
  description: string;
  location: string;
  couldImplicateSuspects?: string | string[];
}

interface SuspectNote {
  id?: string;
  suspectName: string;
  suspectNotes: string;
  createdAt?: string;
}

type SuspicionLevel = 'low' | 'medium' | 'high';

interface InterrogateImageProp {
  src: string;
  alt: string;
  tooltip: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

interface InterrogatePanelProp {
  tooltip: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// ── Draggable hook ─────────────────────────────────────
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

// Tooltip
function InterrogateImagePropWithToolTip( { src, alt, tooltip, className, style, title, onClick}: InterrogateImageProp) {
  return (
    <Tooltip<HTMLImageElement> 
      content={tooltip} 
      className='item-tooltip'
      placement='top'
      offsetPx={1}
    >
     {({ ref, getReferenceProps }) => (
        <img
          className={className}
          src={src}
          alt={alt}
          ref={ref}
          aria-label={title ?? tooltip}
          style={style}
          {...getReferenceProps()}
          onClick={onClick}
        />
      )}
    </Tooltip>
  )
}

function InterrogatePanelWithToolTip({ tooltip, className, style, title, onClick }: InterrogatePanelProp) {
  return (
    <Tooltip<HTMLDivElement>
      content={tooltip}
      className='item-tooltip'
      placement='top'
      offsetPx={-1}
    >
      {({ ref, getReferenceProps }) => (
        <div
          className={className}
          ref={ref}
          aria-label={title ?? tooltip}
          style={style}
          {...getReferenceProps()}
          onClick={onClick}
        />
      )}
    </Tooltip>
  )
}

function Interrogate() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const {
    player,
    seed,
    activeSuspectName,
    isFirstClueDiscovery,
    isResponding,
    elapsed,
    accusationUnlocked,
    totalConversationCount,
    startInterrogation,
    sendMessage,
    makeAccusation,
    tickElapsed,
  } = useGameStore();

  const isSpeaking = useGameStore(s => s.isSpeaking);
  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = useMemo(() => player?.characterProfiles ?? [], [player?.characterProfiles]);
  const [input, setInput] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [cluesModalOpen, setCluesModalOpen] = useState(false);
  const [selectedSuspicionLevel, setSelectedSuspicionLevel] = useState<SuspicionLevel | null>(null);
  const [tutorialOpenOnce, setTutorialOpenOnce] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stressLevel = useActiveSuspectStress();
  const { isMuted, setIsMuted } = useContext(AudioContext);
  const numConversations = totalConversationCount; // totalConversationCount is used to keep track of 
                                                   // whether the user is a first time player or not
  const isFirstTimePlayer = numConversations === 0 || numConversations === 1; // classified as first time player if 1 or less messages sent
  console.log("first time? " + isFirstTimePlayer);

  // ── Evidence / clue state ──────────────────────────────
  const allClues = useNotificationStore(s => s.clues);
  const discoveredClues = allClues.filter(c => c.discovered);
  const ACCUSATION_MIN_CLUES = 2;
  const cluesRemainingForAccusation = Math.max(0, ACCUSATION_MIN_CLUES - discoveredClues.length);
  const accusationLockTooltip = cluesRemainingForAccusation === 1
    ? 'Unlock 1 more clue to use this feature.'
    : `Unlock ${cluesRemainingForAccusation} more clues to use this feature.`;
  const [attachedClues, setAttachedClues] = useState<AttachedClue[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Three fully independent drag positions ─────────────
  const { pos: cluePos,     onMouseDown: clueMouseDown     } = useDraggableModal({ x: window.innerWidth - 340, y: 120 });
  const { pos: notesPos,    onMouseDown: notesMouseDown    } = useDraggableModal({ x: window.innerWidth - 700, y: 120 });
  const { pos: notebookPos, onMouseDown: notebookMouseDown } = useDraggableModal({ x: Math.max(0, window.innerWidth / 2 - 220), y: 80 });

  // ── Notes modal state ──────────────────────────────────
  const [notesList, setNotesList] = useState<SuspectNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteInputOpen, setNoteInputOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const timerPaused = useNotificationStore(s => s.timerPaused);
  const sessionId = player?.caseReport?.caseId ?? '';
  const closeNotesModal = () => {
    setShowNotes(false);
    setNoteInputOpen(false);
    setNoteDraft('');
    setNotesError(null);
  };

  // ── Load notes ─────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!activeSuspectName || !sessionId) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const res = await fetch(
        `http://localhost:3000/case/${sessionId}/suspectNotes?suspectName=${encodeURIComponent(activeSuspectName)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SuspectNote[] = await res.json();
      setNotesList(data);
    } catch {
      setNotesError('Could not load notes.');
    } finally {
      setNotesLoading(false);
    }
  }, [activeSuspectName, sessionId]);

  useEffect(() => {
    if (showNotes) {
      loadNotes();
      setNoteInputOpen(false);
      setNoteDraft('');
    }
  }, [showNotes, activeSuspectName, loadNotes]);

  useEffect(() => {
    if (noteInputOpen) noteTextareaRef.current?.focus();
  }, [noteInputOpen]);

  // ── Save note ──────────────────────────────────────────
  const saveNote = useCallback(async () => {
    if (!noteDraft.trim() || noteSaving) return;
    setNoteSaving(true);
    setNotesError(null);
    try {
      const res = await fetch(`http://localhost:3000/case/${sessionId}/suspectNotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspectName: activeSuspectName,
          suspectNotes: noteDraft.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNoteDraft('');
      setNoteInputOpen(false);
      await loadNotes();
    } catch {
      setNotesError('Failed to save. Try again.');
    } finally {
      setNoteSaving(false);
    }
  }, [noteDraft, noteSaving, sessionId, activeSuspectName, loadNotes]);

  useEffect(() => {
    if (profiles.length === 0) return;
    const hasValidActiveSuspect =
      !!activeSuspectName && profiles.some(p => p.name === activeSuspectName);
    if (!hasValidActiveSuspect) startInterrogation(profiles[0].name);
  }, [activeSuspectName, profiles, startInterrogation]);

  useEffect(() => {
    if (timerPaused) return;
    const id = setInterval(tickElapsed, 1000);
    return () => clearInterval(id);
  }, [timerPaused, tickElapsed]);

  useNotificationScheduler(elapsed, 600_000, !!player);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (!activeProfile) return;
    if ((seed?.difficulty ?? 0) < 3) {
      setSelectedSuspicionLevel(activeProfile.suspicionLevel);
      return;
    }
    setSelectedSuspicionLevel(null);
  }, [activeProfile, seed?.difficulty]);

  const { isListening, toggle: toggleSpeech } = useSpeechToText(
    (transcript) => setInput(prev => prev ? `${prev} ${transcript}` : transcript)
    // appends to existing input rather than replacing it
  );

  // ── Drop zone ──────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/clue');
    if (!raw) return;
    try {
      const clue: AttachedClue = JSON.parse(raw);
      setAttachedClues(prev => prev.find(c => c.id === clue.id) ? prev : [...prev, clue]);
    } catch { console.warn('Could not parse dropped clue data'); }
  };

  const getImplicatingSuspects = (clue: AttachedClue): string[] => {
    if (Array.isArray(clue.couldImplicateSuspects)) return clue.couldImplicateSuspects;
    if (typeof clue.couldImplicateSuspects === 'string')
      return clue.couldImplicateSuspects.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  const clueImplicatesCurrent = (clue: AttachedClue) =>
    getImplicatingSuspects(clue).some(s => s.toLowerCase() === activeSuspectName?.toLowerCase());

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && attachedClues.length === 0) || isResponding) return;
    const typedText = input.trim();
    const cluesForDisplay = attachedClues.map(c => ({ id: c.id, name: c.name }));
    let llmText = typedText;
    if (attachedClues.length > 0) {
      const evidenceBlock = attachedClues.map(clue => {
        const implicating = clueImplicatesCurrent(clue);
        return [
          `[EVIDENCE PRESENTED: "${clue.name}"]`,
          `  Location found: ${clue.location}`,
          `  Details: ${clue.description}`,
          implicating
            ? `  ⚠️ This evidence directly implicates you. React with significantly elevated stress and defensiveness.`
            : `  This evidence has been shown to you.`,
        ].join('\n');
      }).join('\n\n');
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

  const handleOpenTutorial = () => {
    localStorage.removeItem('tutorialSeen');
    localStorage.removeItem('tutorialStep');
    setTutorialOpenOnce(prev => prev + 1);
  };

  useEffect(() => {
    const handlePotentialSignOutClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
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

  // Source - https://stackoverflow.com/a/68933242
  // Posted by Drew Reese, modified by community. See post 'Timeline' for change history
  // Retrieved 2026-04-01, License - CC BY-SA 4.0

  useEffect(() => {
    const unloadCallback = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", unloadCallback);
    return () => window.removeEventListener("beforeunload", unloadCallback);
  }, []);


  if (!player) {
    return (
      <div className="interrogate-container">
        No active case. <Link to="/">Go Home</Link>
      </div>
    );
  }

  return (
    <div className='game-container'>

      {/* ── Sidebar nav ── */}
      <div className='navigate'>

        {/* ── Vertical suspect avatar picker ── */}
        <div className="suspect-avatar-picker">
          <div className="suspect-picker-label">SUSPECTS</div>
          {profiles.map((p) => {
            const isActive = activeSuspectName === p.name;
            return (
              <button
                key={p.name}
                className={`suspect-avatar-btn ${isActive ? 'active' : ''}`}
                onClick={() => { startInterrogation(p.name); setInput(''); setAttachedClues([]); }}
                title={p.name}
              >
                {p.portraitFeatures
                  ? <SuspectPortrait className="suspect-picker-portrait" features={p.portraitFeatures} size={108} />
                  : <div style={{ width: 80, height: 80, background: '#111' }} />
                }
                <span className="suspect-avatar-name">{p.name}</span>
              </button>
            );
          })}
        </div>
            

        <button
          className={isFirstClueDiscovery ? 'desk-guide-button' : ''}
          onClick={() => navigate("/desk")}
        >Desk</button>

        <button onClick={() =>
          (document.getElementById('settings') as HTMLDialogElement)?.showModal()
        }>Settings</button>
        
        

        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
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

        {!accusationUnlocked ? (
          <Tooltip<HTMLButtonElement>
            content={accusationLockTooltip}
            className="item-tooltip"
            placement="right"
            offsetPx={8}
          >
            {({ ref, getReferenceProps }) => (
              <button
                ref={ref}
                type="button"
                className="disabled-button"
                aria-label="Accuse locked"
                {...getReferenceProps()}
              >
                Accuse
              </button>
            )}
          </Tooltip>
        ) : (
          <button
            onClick={() =>
              (document.getElementById('accuse') as HTMLDialogElement)?.showModal()
            }
          >
            Accuse
          </button>
        )}
        {accusationUnlocked && (
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
        )}
        

        <dialog className="nes-dialog" id="signout-warning">
          <form method="dialog">
            <h3>Leave Account?</h3>
            <p>You are about to sign out from this device.</p>
            <p>You will lose all progress if you choose to sign out.</p>
            <menu className="dialog-menu">
              <button type="submit">Stay</button>
              <button type="button" onClick={handleConfirmSignOut}>Leave</button>
            </menu>
          </form>
        </dialog>

        {/* Auth */}
        {/* <div className="nav-auth">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="user-button">Sign In</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="auth-actions auth-actions-signed-in">
              <UserButton userProfileMode="modal" showName appearance={{ options: { shimmer: false } }} />
            </div>
          </Show>
        </div> */}
        {isFirstTimePlayer && (
          <>
            <button className='tutorial-button' onClick={handleOpenTutorial}>Open tutorial?</button>
            <TutorialModal key={tutorialOpenOnce} />
          </>
          
          )}
        
        <div className='notification-board'>
          {isFirstClueDiscovery && (
            <div className="first-clue-guide" role="status" aria-live="polite">
              <p className="first-clue-guide-title">First Clue Discovered</p>
              <p className="first-clue-guide-body">
                <strong>Step 1:</strong> Click the highlighted Desk button above. <br /> <br />
                <strong>Step 2:</strong> Open the Clues page from the Desk to review your newly acquired evidence.
              </p>
            </div>
          )}  
        </div>
      </div>
      

      {/* ── Main interrogation area ── */}
      <div className="interrogate-container" style={{ position: 'relative' }}>

        {/* ── Clickable case-details image (replaces bg layer) ── */}
        <InterrogateImagePropWithToolTip
          src="src/assets/updatedcasedetails.png"
          alt="Case Details"
          className="bg-img-casedetails"
          tooltip={showNotebook ? 'Close suspect profile' : 'Open suspect profile'}
          onClick={() => setShowNotebook(v => !v)}
          title="Suspect Profile"
        />

        {/* ── Clickable locker image (replaces bg layer) ── */}
        <InterrogateImagePropWithToolTip
          src="src/assets/locker.png"
          alt="Evidence Locker"
          className="bg-img-locker"
          tooltip={cluesModalOpen ? 'Close Evidence Locker' : 'Open Evidence Locker' + ' to add Clues to the Conversation'}
          onClick={() => setCluesModalOpen(v => !v)}
          title="Evidence Locker"
        />

        <div className='header-row'>
          <div className='currently-interrogating-container'>
            <h1>INTERROGATING: {activeProfile?.name.toUpperCase()}</h1>
          </div>
          <div className='user-icon'>
            <Show when="signed-in">
              <div className="auth-actions auth-actions-signed-in">
                <UserButton userProfileMode="modal" showName appearance={{ options: { shimmer: false } }} />
              </div>
            </Show>
          </div>
        </div>

        <div className='windows-container'>
          <div className='interrogation-window'>

            {activeProfile && (
              <div className='character-container'>
                <div className='character-avatar'>
                  {activeProfile.portraitFeatures
                    ? <SuspectPortrait
                        className="interrogate-main-portrait"
                        features={activeProfile.portraitFeatures}
                        size={560}
                        isSpeaking={isSpeaking}
                      />
                    : <div style={{ width: 384, height: 384, background: '#111' }} />
                  }
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
                          {msg.displayClues && msg.displayClues.length > 0 && (
                            <div className="chat-clue-chips">
                              {msg.displayClues.map((c: { id: string; name: string }) => (
                                <span key={c.id} className="chat-clue-chip">🔍 {c.name}</span>
                              ))}
                            </div>
                          )}
                          {msg.displayText && <span>{msg.displayText}</span>}
                          {!msg.displayText && !msg.displayClues?.length && <span>{msg.text}</span>}
                        </div>
                      ) : (
                        <p className='bot-message'>
                          <strong>{activeProfile?.name}:</strong> {msg.displayText}
                        </p>
                      )}
                    </div>
                  ))}
                  {isResponding && (
                    <p className='bot-message' style={{ opacity: 0.5, fontStyle: 'italic' }}>
                      <strong>{activeProfile?.name}:</strong> Thinking…
                    </p>
                  )}
                  <div ref={chatEndRef} />
                </div>

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
                              onClick={() => setAttachedClues(prev => prev.filter(c => c.id !== clue.id))}
                            >✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {isDragOver && <div className="drop-hint">Drop clue to present as evidence</div>}
                  <div className='question-box'>
                    <input
                      type="text"
                      placeholder={attachedClues.length > 0 ? 'Add a question, or send silently…' : 'Ask questions here...'}
                      value={input}
                      disabled={isResponding}
                      onChange={e => setInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={toggleSpeech}
                      disabled={isResponding}
                      className={`mic-btn ${isListening ? 'mic-btn--active' : ''}`}
                      title={isListening ? 'Stop listening' : 'Speak your question'}
                    >
                      {isListening ? '🔴' : '🎙️'}
                    </button>
                  </div>
                  <div className='submit-button'>
                    <button
                      type='submit'
                      disabled={isResponding || (!input.trim() && attachedClues.length === 0)}
                    >Submit</button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Notepad image — opens notebook modal */}
          <InterrogatePanelWithToolTip
            className='notes-window'
            tooltip={showNotes ? 'Close Notepad for Suspect' : 'Open Notepad for Suspect'}
            title='Field Notes'
            onClick={() => setShowNotes(v => !v)}
          />
        </div>
      </div>
      
      {/* ══════════════════════════════════════════════════
          EVIDENCE LOCKER MODAL — draggable, independent
      ══════════════════════════════════════════════════ */}
      {cluesModalOpen && (
        <div className="clue-modal" style={{ left: cluePos.x, top: cluePos.y }}>
          <div className="clue-modal-handle" onMouseDown={clueMouseDown}>
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
                        id: clue.id, name: clue.name, description: clue.description,
                        location: clue.location, couldImplicateSuspects: clue.couldImplicateSuspects,
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

      {/* ══════════════════════════════════════════════════
          NOTES MODAL — draggable, independent
      ══════════════════════════════════════════════════ */}
      {showNotes && (
        <div className="clue-modal notes-drag-modal notes-modal" style={{ left: notesPos.x, top: notesPos.y }}>
          <div className="clue-modal-handle" onMouseDown={notesMouseDown}>
            <span className="clue-modal-title">FIELD NOTES</span>
            <div className="clue-modal-handle-dots">
              <span /><span /><span /><span /><span /><span />
            </div>
            <button
              className="clue-modal-close"
              onMouseDown={e => e.stopPropagation()}
              onClick={closeNotesModal}
            >✕</button>
          </div>

          <div className="notes-suspect-bar">
            <div className="notes-suspect-name">
              {activeProfile?.name ?? activeSuspectName ?? 'UNKNOWN SUSPECT'}
            </div>
            <button type="button" className="notes-reload-btn" onClick={() => loadNotes()}>
              ↻
            </button>
          </div>

          <div className="clue-modal-body notes-modal-body">
            {notesLoading && <p className="notes-error">Loading notes…</p>}
            {!notesLoading && notesList.length === 0 && !notesError && (
              <p className="notes-hint">No notes saved for this suspect yet.</p>
            )}
            {!notesLoading && notesList.map((note, i) => (
              <div key={note.id ?? i} className="notes-entry">
                <p className="notes-entry-text">{note.suspectNotes}</p>
                {note.createdAt && (
                  <span className="notes-entry-time">{new Date(note.createdAt).toLocaleString()}</span>
                )}
              </div>
            ))}
          </div>

          {noteInputOpen && (
            <div className="notes-input-panel" onMouseDown={e => e.stopPropagation()}>
              <textarea
                ref={noteTextareaRef}
                className="notes-textarea"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Write your note here…"
                rows={4}
              />
              <div className="notes-input-actions">
                <span className="notes-hint">Add a new note for this suspect</span>
                <button
                  type="button"
                  className="notes-cancel-btn"
                  onClick={() => { setNoteInputOpen(false); setNoteDraft(''); setNotesError(null); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="notes-save-btn"
                  onClick={saveNote}
                  disabled={noteSaving || !noteDraft.trim()}
                >
                  {noteSaving ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          <div className="clue-modal-footer">
            {notesError && <span className="notes-error">{notesError}</span>}
            <button
              className="notes-add-btn"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => { setNoteInputOpen(v => !v); setNotesError(null); }}
            >
              {noteInputOpen ? '— Close' : '+ Add Note'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          NOTEBOOK / SUSPECT PROFILE — draggable, independent
      ══════════════════════════════════════════════════ */}
      {showNotebook && (
        <div className="clue-modal notebook-drag-modal" style={{ left: notebookPos.x, top: notebookPos.y }}>
          <div className="clue-modal-handle" onMouseDown={notebookMouseDown}>
            <span className="clue-modal-title">SUSPECT PROFILE</span>
            <div className="clue-modal-handle-dots">
              <span /><span /><span /><span /><span /><span />
            </div>
            <button
              className="clue-modal-close"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowNotebook(false)}
            >✕</button>
          </div>

          <div className="clue-modal-body notebook-modal-body">
            {activeProfile && (
              <div className="notebook-suspect-card">
                <div className="notebook-suspect-header">
                  {activeProfile.portraitFeatures
                    ? <SuspectPortrait className="notebook-suspect-portrait" features={activeProfile.portraitFeatures} size={260} />
                    : <div style={{ width: 384, height: 384, background: '#111' }} />
                  }
                  <div>
                    <div className="notebook-suspect-name">{activeProfile.name}</div>
                    <div className="notebook-suspect-meta">{activeProfile.age} · {activeProfile.occupation}</div>
                    <div className="notebook-suspicion-buttons" role="group" aria-label="Suspicion level selector">
                      {(['low', 'medium', 'high'] as SuspicionLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`notebook-suspicion-btn suspicion-${level} ${selectedSuspicionLevel === level ? 'active' : ''}`}
                          onClick={() => setSelectedSuspicionLevel(level)}
                          aria-pressed={selectedSuspicionLevel === level}
                        >
                          {level.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="notebook-suspect-divider" />
                <div className="notebook-suspect-field"><strong>Relation: </strong>{activeProfile.relationshipToVictim}</div>
                <div className="notebook-suspect-field"><strong>Alibi:</strong> {activeProfile.claimedAlibi}</div>
                <div className="notebook-suspect-field"><strong>Notes:</strong> {activeProfile.personalityBlurb}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <NotificationToast />
      <MinigameModal />
    </div>
  );
}

export default Interrogate;