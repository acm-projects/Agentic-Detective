import { useState, useEffect, useRef } from 'react';
import './Suspects.css';
import { useGameStore } from './useGameStore';
import { useNavigate } from 'react-router-dom';

// ── Tag config ──
const TAG_CONFIG = {
  neutral:    { label: "Neutral",    color: "#4a3f2f" },
  suspicious: { label: "Suspicious", color: "#8b1a1a" },
  cleared:    { label: "Cleared",    color: "#1a4a2f" },
  alibi:      { label: "Alibi",      color: "#1a2f4a" },
} as const;

type TagKey = keyof typeof TAG_CONFIG;

interface SuspectNote {
  suspectName: string;
  note: string;
  tag: TagKey;
}

interface CaseNote {
  id: number;
  text: string;
  pinned: boolean;
  timestamp: string;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Suspects() {
  const navigate = useNavigate();
  const { player, goToBriefing, interrogateSuspects } = useGameStore();
  const profiles = player?.characterProfiles ?? [];

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState<'suspects' | 'case'>('suspects');

  // ── Selected suspect ──
  const [selectedSuspect, setSelectedSuspect] = useState<typeof profiles[number] | undefined>(
    profiles[0]
  );

  // ── Per-suspect notes + tags ──
  const [suspectNotes, setSuspectNotes] = useState<SuspectNote[]>(
    profiles.map(p => ({
      suspectName: p.name,
      note: '',
      tag: 'neutral' as TagKey,
    }))
  );

  // ── Case scratchpad notes ──
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selectedSuspect && profiles.length > 0) {
      setSelectedSuspect(profiles[0]);
    }
  }, []);

  const updateSuspectNote = (name: string, field: Partial<SuspectNote>) => {
    setSuspectNotes(prev =>
      prev.map(n => n.suspectName === name ? { ...n, ...field } : n)
    );
  };

  const addCaseNote = () => {
    if (!newNote.trim()) return;
    setCaseNotes(prev => [
      { id: Date.now(), text: newNote.trim(), pinned: false, timestamp: now() },
      ...prev,
    ]);
    setNewNote('');
    textareaRef.current?.focus();
  };

  const togglePin = (id: number) => {
    setCaseNotes(prev =>
      prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)
    );
  };

  const deleteNote = (id: number) => {
    setCaseNotes(prev => prev.filter(n => n.id !== id));
  };

  const activeSuspectNote = suspectNotes.find(n => n.suspectName === selectedSuspect?.name);

  const sortedCaseNotes = [...caseNotes].sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );

  return (
    <div className="suspects-wrapper">
      <div className="suspects-container">

        {/* Header */}
        <div className="suspects-header">
          <h1>{player.caseReport.caseTitle}</h1>
        </div>

        {/* Main Layout */}
        <div className="suspects-layout">

          {/* ── Left Sidebar ── */}
          <div className="suspects-sidebar">
            <div className="sidebar-header">
              <h3>SUSPECTS</h3>
            </div>

            <div className="suspect-list">
              {profiles.map((suspect) => {
                const note = suspectNotes.find(n => n.suspectName === suspect.name);
                const isActive = selectedSuspect?.id === suspect?.id && activeTab === 'suspects';
                return (
                  <button
                    key={suspect?.id}
                    className={`suspect-button ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSuspect(suspect);
                      setActiveTab('suspects');
                    }}
                  >
                    <span className="suspect-button-name">{suspect.name}</span>
                    {note?.tag !== 'neutral' && (
                      <span
                        className="suspect-tag-dot"
                        style={{ background: TAG_CONFIG[note?.tag ?? 'neutral'].color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab switcher */}
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab-btn ${activeTab === 'suspects' ? 'active' : ''}`}
                onClick={() => setActiveTab('suspects')}
              >
                Profiles
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'case' ? 'active' : ''}`}
                onClick={() => setActiveTab('case')}
              >
                Case Notes
              </button>
            </div>

            {/* Nav buttons */}
            <div className="sidebar-nav">
              <button className="back-button" onClick={() => goToBriefing(navigate)}>
                ← Case Report
              </button>
              <button className="back-button" onClick={() => navigate('/clues')}>
                ← Clues
              </button>
              <button className="back-button" onClick={() => interrogateSuspects(navigate)}>
                ← Interrogation
              </button>
            </div>
          </div>

          {/* ── Right Main Area ── */}
          <div className="suspects-main">

            {/* ══ TAB: SUSPECT PROFILES ══ */}
            {activeTab === 'suspects' && (
              <>
                <div className="main-header">
                  <h3>CASE NOTEPAD</h3>
                </div>

                {selectedSuspect && activeSuspectNote ? (
                  <div className="suspect-details-container">

                    <div className="suspect-name-section">
                      <h4>NAME</h4>
                      <div className="suspect-info">
                        <p>{selectedSuspect.name.toUpperCase()}</p>
                        <ul>
                          <li>Age: {selectedSuspect.age}</li>
                          <li>Occupation: {selectedSuspect.occupation}</li>
                          <li>Relationship to Victim: {selectedSuspect.relationshipToVictim}</li>
                        </ul>
                      </div>
                    </div>

                    <div className="suspect-biodata-section">

                      <div className="polaroid">
                        <div className="polaroid-content">
                          <img
                            src={`/avatars/${selectedSuspect.avatarId}.png`}
                            alt={selectedSuspect.name}
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="polaroid-label">{selectedSuspect.name}</p>
                      </div>

                      <div className="biodata-section">
                        <h4>BIODATA</h4>
                        <ul>
                          <li>{selectedSuspect.personalityBlurb}</li>
                          <li><em>"{selectedSuspect.claimedAlibi}"</em></li>
                          <li>
                            Suspicion:{' '}
                            <span className={`suspicion-tag suspicion-${selectedSuspect.suspicionLevel}`}>
                              {selectedSuspect.suspicionLevel.toUpperCase()}
                            </span>
                          </li>
                        </ul>

                        <div className="tag-row">
                          <span className="tag-row-label">Your assessment:</span>
                          {(Object.keys(TAG_CONFIG) as TagKey[]).map(tag => (
                            <button
                              key={tag}
                              className={`tag-btn ${activeSuspectNote.tag === tag ? 'active' : ''}`}
                              style={{ '--tag-color': TAG_CONFIG[tag].color } as React.CSSProperties}
                              onClick={() => updateSuspectNote(selectedSuspect.name, { tag })}
                            >
                              {TAG_CONFIG[tag].label}
                            </button>
                          ))}
                        </div>

                        <div className="Notes-section">
                          <h4>Notes</h4>
                          <textarea
                            className="notepad-textarea"
                            placeholder={`Write your observations about ${selectedSuspect.name}…\n\nWhat did they say? What felt off? Any contradictions?`}
                            value={activeSuspectNote.note}
                            onChange={e =>
                              updateSuspectNote(selectedSuspect.name, { note: e.target.value })
                            }
                            rows={6}
                          />
                          <div className="notepad-char-count">
                            {activeSuspectNote.note.length} chars
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ padding: '1rem', opacity: 0.5 }}>Select a suspect to view their profile.</p>
                )}
              </>
            )}

            {/* ══ TAB: CASE SCRATCHPAD ══ */}
            {activeTab === 'case' && (
              <>
                <div className="main-header">
                  <h3>CASE SCRATCHPAD</h3>
                </div>

                <div className="case-scratchpad">

                  <div className="scratchpad-input-row">
                    <textarea
                      ref={textareaRef}
                      className="scratchpad-input"
                      placeholder="Add a case note… a theory, a connection, a clue observation"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addCaseNote();
                      }}
                      rows={3}
                    />
                    <button className="scratchpad-add-btn" onClick={addCaseNote}>
                      <span>+ Add Note</span>
                      <span className="scratchpad-hint">⌘↵</span>
                    </button>
                  </div>

                  <div className="scratchpad-list">
                    {sortedCaseNotes.length === 0 && (
                      <div className="scratchpad-empty">
                        No notes yet. Start writing your theories…
                      </div>
                    )}
                    {sortedCaseNotes.map(note => (
                      <div
                        key={note.id}
                        className={`scratchpad-note ${note.pinned ? 'pinned' : ''}`}
                      >
                        {note.pinned && <div className="pin-indicator">📌</div>}
                        <p className="scratchpad-note-text">{note.text}</p>
                        <div className="scratchpad-note-footer">
                          <span className="scratchpad-note-time">{note.timestamp}</span>
                          <div className="scratchpad-note-actions">
                            <button
                              className="note-action-btn"
                              onClick={() => togglePin(note.id)}
                            >
                              {note.pinned ? 'Unpin' : '📌 Pin'}
                            </button>
                            <button
                              className="note-action-btn delete"
                              onClick={() => deleteNote(note.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default Suspects;
