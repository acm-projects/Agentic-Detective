import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress, type SuspicionLevel } from './useGameStore';
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

interface InterrogateImageProp {
  src: string;
  alt: string;
  tooltip: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  tutorialId?: string;
}

interface InterrogatePanelProp {
  tooltip: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  tutorialId?: string;
  children?: React.ReactNode;
}

interface NotificationBoardPayload {
  title: string;
  bodyText: React.ReactNode;
  condition: boolean;
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
function InterrogateImagePropWithToolTip( { src, alt, tooltip, className, style, title, onClick, tutorialId}: InterrogateImageProp) {
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
          data-tutorial-id={tutorialId}
          {...getReferenceProps()}
          onClick={onClick}
        />
      )}
    </Tooltip>
  )
}

function InterrogatePanelWithToolTip({ tooltip, className, style, title, onClick, tutorialId, children }: InterrogatePanelProp) {
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
          data-tutorial-id={tutorialId}
          {...getReferenceProps()}
          onClick={onClick}
        >
          {children}
        </div>
      )}
    </Tooltip>
  )
}

// Notification Board Common Function
function PopulateNotificationBoard({
  title,
  bodyText,
  condition,
}: NotificationBoardPayload) {
  if (!condition) return null;

  return (
    <div className="first-clue-guide" role="status" aria-live="polite">
      <p className="first-clue-guide-title">{title}</p>
      <p className="first-clue-guide-body">{bodyText}</p>
    </div>
  );

}

function Interrogate() {
  const TUTORIAL_KEY = 'tutorialSeen';
  const TUTORIAL_STEP_KEY = 'tutorialStep';
  const TUTORIAL_READY_KEY = 'tutorialReadyAfterReport';
  const TUTORIAL_DESK_ENTERED_KEY = 'tutorialDeskEntered';
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const {
    player,
    seed,
    phase,
    currentSessionId,
    activeSuspectName,
    numDiscoveredClues,
    isFirstClueDiscovery,
    isResponding,
    elapsed,
    accusationUnlocked,
    totalConversationCount,
    startInterrogation,
    sendMessage,
    makeAccusation,
    tickElapsed,
    setSuspicionLevelForSuspect,
  } = useGameStore();

  const isSpeaking = useGameStore(s => s.isSpeaking);
  const history = useActiveHistory();
  const activeProfile = useActiveSuspectProfile();
  const profiles = useMemo(() => player?.characterProfiles ?? [], [player?.characterProfiles]);
  const [input, setInput] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [cluesModalOpen, setCluesModalOpen] = useState(false);
  const [tutorialVersion, setTutorialVersion] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stressLevel = useActiveSuspectStress();
  const { isMuted, setIsMuted } = useContext(AudioContext);
  const isFirstTimePlayer = totalConversationCount <= 2;
  console.log("first time? " + isFirstTimePlayer);

  // ── Evidence / clue state ──────────────────────────────
  const allClues = useNotificationStore(s => s.clues);
  const discoveredClues = allClues.filter(c => c.discovered);
  const lostClueCount = useNotificationStore(s => s.clues.reduce((count, clue) => count + (clue.clueLost ? 1 : 0), 0));
  const hasLostClues = lostClueCount > 0;
  const ACCUSATION_MIN_CLUES = 2;
  const cluesRemainingForAccusation = Math.max(0, ACCUSATION_MIN_CLUES - discoveredClues.length);
  const accusationLockTooltip = cluesRemainingForAccusation === 1
    ? 'Unlock 1 more clue to use this feature.'
    : `Unlock ${cluesRemainingForAccusation} more clues to use this feature.`;
  const [attachedClues, setAttachedClues] = useState<AttachedClue[]>([]);
  const [isDraggingClue, setIsDraggingClue] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // const [recentlyLostClueName, setRecentlyLostClueName] = useState<string | null>(null);
  const previousLostCountRef = useRef(lostClueCount);
  const [newClueLost, setNewClueLost] = useState(false);
  const [accuseUnlockedNotice, setAccuseUnlockNotice] = useState(false);
  const [stressIncreaseNotice, setStressIncreaseNotice] = useState<{
    title: string;
    bodyText: React.ReactNode;
  } | null>(null);
  const previousStressRef = useRef(stressLevel);

  // ── Three fully independent drag positions ─────────────
  const { pos: cluePos,     onMouseDown: clueMouseDown     } = useDraggableModal({ x: window.innerWidth - 380, y: 120 });
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
  const previousAccusationUnlockedRef = useRef(accusationUnlocked);

  const timerPaused = useNotificationStore(s => s.timerPaused);
  const sessionId = currentSessionId || player?.caseReport?.caseId || '';
  const storedSuspicionLevel = useGameStore(s =>
    activeSuspectName ? s.sessions[activeSuspectName]?.suspicionLevel ?? null : null
  );
  const notebookSuspicionLevel = storedSuspicionLevel ?? activeProfile?.suspicionLevel ?? null;

  const saveSuspicionLevel = useCallback(async (nextLevel: SuspicionLevel) => {
    if (!activeSuspectName) return;

    const store = useGameStore.getState();
    const userId = store.seed?.userId ?? '';
    const persistedSessionId = store.currentSessionId || store.player?.caseReport?.caseId || '';
    if (!userId || !persistedSessionId) return;

    const suspectSessions = Object.values(store.sessions).map((s) => ({
      suspectName: s.suspectName,
      conversationCount: s.conversationCount,
      currentStress: s.stressLevel,
      suspicionLevel: s.suspectName === activeSuspectName ? nextLevel : (s.suspicionLevel ?? null),
      firstInterrogatedAt: null,
      lastInterrogatedAt: new Date().toISOString(),
      messages: s.history.map((m) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp,
      })),
    }));

    const { useNotificationStore } = await import('./store/useNotificationStore');
    const notificationState = useNotificationStore.getState();

    await fetch(`http://localhost:3000/cases/${persistedSessionId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        status: phase === 'resolved' ? 'resolved' : 'in_progress',
        game: {
          phase,
          elapsedSeconds: elapsed,
          activeSuspectName,
          totalConversationCount,
          seed,
        },
        interrogation: { suspectSessions },
        schedulerState: {
          lastFiredAt: notificationState.lastFiredAt,
          nextFireAt: notificationState.nextFireAt,
          timerPaused: notificationState.timerPaused,
        },
      }),
    }).catch(() => {});
  }, [activeSuspectName, elapsed, phase, seed, totalConversationCount]);
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
      const userId = seed?.userId ?? '';
      const query = new URLSearchParams({ suspectName: activeSuspectName });
      if (userId) query.set('userId', userId);
      const res = await fetch(
        `http://localhost:3000/case/${sessionId}/suspectNotes?${query.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SuspectNote[] = await res.json();
      setNotesList(data);
    } catch {
      setNotesError('Could not load notes.');
    } finally {
      setNotesLoading(false);
    }
  }, [activeSuspectName, sessionId, seed?.userId]);

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

  useEffect(() => {
    if (lostClueCount > previousLostCountRef.current) {
      setNewClueLost(true);
    }

    previousLostCountRef.current = lostClueCount;
  }, [lostClueCount]);

  useEffect(() => {
    const previousStress = previousStressRef.current;

    if (stressLevel > previousStress && activeSuspectName) {
      setStressIncreaseNotice({
        title: 'Stress Increased',
        bodyText: (
          <>
            {activeSuspectName} became more stressed after your last question.
            <br />
          </>
        ),
      });

      const timeoutId = window.setTimeout(() => {
        setStressIncreaseNotice(null);
      }, 7000);

      previousStressRef.current = stressLevel;

      return () => window.clearTimeout(timeoutId);
    }

    previousStressRef.current = stressLevel;
  }, [activeSuspectName, stressLevel]);

  useEffect(() => {
    if (!newClueLost) return;

    const id = window.setTimeout(() => {
      setNewClueLost(false);
    }, 10000);

    return () => window.clearTimeout(id);
  }, [newClueLost]);

  // Accusation Notification
  useEffect(() => {
    const wasLocked = !previousAccusationUnlockedRef.current;

    if (wasLocked && accusationUnlocked) {
      setAccuseUnlockNotice(true);

      const id = window.setTimeout(() => {
        setAccuseUnlockNotice(false);
      }, 10000);

      previousAccusationUnlockedRef.current = accusationUnlocked;
      return () => window.clearTimeout(id);
    }

    previousAccusationUnlockedRef.current = accusationUnlocked;
  }, [accusationUnlocked]);

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
          userId: seed?.userId ?? '',
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
    setIsDraggingClue(false);
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

  const handleReopenTutorial = () => {
    localStorage.removeItem(TUTORIAL_KEY);
    localStorage.removeItem(TUTORIAL_STEP_KEY);
    localStorage.setItem(TUTORIAL_READY_KEY, 'true');
    localStorage.setItem(TUTORIAL_DESK_ENTERED_KEY, 'true');
    setTutorialVersion(prev => prev + 1);
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
    }
    document.addEventListener('click', handlePotentialSignOutClick, true);
    console.log('stress: ' + stressLevel)
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

  // Avatar index map for vertical suspect picker (1-based)
  return (
    <div className='game-container'>
      <TutorialModal key={tutorialVersion} />

      {/* ── Sidebar nav ── */}
      <div className='navigate'>

        {/* ── Vertical suspect avatar picker ── */}

          <InterrogatePanelWithToolTip
            tooltip='Switch Between Suspects'
            className='suspect-avatar-picker'
            title='SUSPECTS'
            tutorialId='tutorial-suspect-picker'
          >
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
          </InterrogatePanelWithToolTip>
            

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

        {isFirstTimePlayer && (
          <button onClick={handleReopenTutorial}>Reopen Tutorial?</button>
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
        {/* Notification Board */}
        <div className='notification-board'>
          <PopulateNotificationBoard
            condition={hasLostClues && newClueLost}
            title="Clue Lost"
            bodyText="You failed the minigame, and have lost a key clue for your investigation."
          />
          <PopulateNotificationBoard
            condition={accuseUnlockedNotice}
            title="Accusation Unlocked"
            bodyText="You can now make your accusation."
          />
          <PopulateNotificationBoard
            condition={Boolean(stressIncreaseNotice)}
            title={stressIncreaseNotice?.title ?? ''}
            bodyText={stressIncreaseNotice?.bodyText ?? ''}
          />
          <PopulateNotificationBoard
            condition={isFirstClueDiscovery}
            title="First Clue Discovered"
            bodyText={
              <>
              <strong>Step 1:</strong> Click the highlighted Desk button above. <br /> <br />
              <strong>Step 2:</strong> Open the Clues page from the Desk to review your newly acquired evidence.
              </>
            }
          />

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
          tutorialId="tutorial-suspect-details"
        />

        {/* ── Clickable locker image (replaces bg layer) ── */}
        <InterrogateImagePropWithToolTip
          src="src/assets/locker.png"
          alt="Evidence Locker"
          className="bg-img-locker"
          tooltip={cluesModalOpen ? 'Close Evidence Locker' : 'Open Evidence Locker' + ' to add Clues to the Conversation'}
          onClick={() => setCluesModalOpen(v => !v)}
          title="Evidence Locker"
          tutorialId="tutorial-evidence-locker"
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
                  {/* --- Stress Droplet --- */}
                  <div className='droplet-container'
                    style={{
                      opacity: Math.min(1, stressLevel / 100 + 0.2),
                    }}>
                    {stressLevel > 0 && (
                      <InterrogateImagePropWithToolTip
                        src="src/assets/stress_sweat_drop1.png"
                        alt="Stress Droplet"
                        className='stress-droplet-img' // transparency updated based on current stress level
                        tooltip={ stressLevel > 70 ? 'The suspect appears to be breaking' : 'The suspect is starting to appear stressed!'} // update this to edit based on suspect stress level
                        title="Stress Droplet"
                      />
                    )}
                    
                  </div>
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
                      BEGIN QUESTIONING {activeProfile?.name.toUpperCase()} ...
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
                  className={`question-submit-box ${(isDragOver || isDraggingClue) ? 'drag-over' : ''}`}
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
                  {isDraggingClue && <div className="drop-hint">Drop clue to present evidence</div>}
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
            tutorialId='tutorial-notes'
          />
        </div>
      </div>
      
      {/* ══════════════════════════════════════════════════
          NOTES MODAL — fully independent
      ══════════════════════════════════════════════════ */}
      {showNotes && (
        <div className="clue-modal" style={{ left: notesPos.x, top: notesPos.y }}>
          <div className="clue-modal-handle" onMouseDown={notesMouseDown}>
            <span className="clue-modal-title">FIELD NOTES</span>
            <div className="clue-modal-handle-dots">
              <span /><span /><span /><span /><span /><span />
            </div>
            <button
              className="clue-modal-close"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowNotes(false)}
            >✕</button>
          </div>

          <div className="notes-suspect-bar">
            <span className="notes-suspect-name">{activeSuspectName?.toUpperCase()}</span>
            <button
              className="notes-reload-btn"
              onMouseDown={e => e.stopPropagation()}
              onClick={loadNotes}
              title="Reload notes"
            >↻</button>
          </div>

          <div className="clue-modal-body notes-modal-body">
            {notesLoading && <p className="clue-modal-empty">Loading…</p>}
            {!notesLoading && notesList.length === 0 && (
              <p className="clue-modal-empty">No notes yet for this suspect.</p>
            )}
            {!notesLoading && notesList.map((n, i) => (
              <div key={n.id ?? i} className="notes-entry">
                <p className="notes-entry-text">{n.suspectNotes}</p>
                {n.createdAt && (
                  <span className="notes-entry-time">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>

          {noteInputOpen && (
            <div className="notes-input-panel">
              <textarea
                ref={noteTextareaRef}
                className="notes-textarea"
                placeholder={`Observations on ${activeSuspectName}…`}
                value={noteDraft}
                rows={4}
                onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
                  if (e.key === 'Escape') { setNoteInputOpen(false); setNoteDraft(''); }
                }}
              />
              {notesError && <p className="notes-error">{notesError}</p>}
              <div className="notes-input-actions">
                <span className="notes-hint">Ctrl+↵ to save · Esc to cancel</span>
                <button
                  className="notes-cancel-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => { setNoteInputOpen(false); setNoteDraft(''); setNotesError(null); }}
                >Cancel</button>
                <button
                  className="notes-save-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={saveNote}
                  disabled={noteSaving || !noteDraft.trim()}
                >
                  {noteSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div className="clue-modal-footer">
            {notesError && !noteInputOpen && <span className="notes-error">{notesError}</span>}
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
                      setIsDraggingClue(true);
                      e.dataTransfer.setData('application/clue', JSON.stringify({
                        id: clue.id, name: clue.name, description: clue.description,
                        location: clue.location, couldImplicateSuspects: clue.couldImplicateSuspects,
                      }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragEnd={() => {
                      setIsDraggingClue(false);
                      setIsDragOver(false);
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

          <div className='clue-modal-navigator'>
            
              {numDiscoveredClues > 0 && (
                <button 
                  className='clue-modal-button'
                  onClick={() => navigate('/clues')}
                >
                  Jump to the Clues Page <br />
                  for more details
                </button>
              )}
              
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
                          className={`notebook-suspicion-btn suspicion-${level} ${notebookSuspicionLevel === level ? 'active' : ''}`}
                          onClick={() => {
                            setSuspicionLevelForSuspect(activeProfile.name, level);
                            void saveSuspicionLevel(level);
                          }}
                          aria-pressed={notebookSuspicionLevel === level}
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