import { useState, useEffect, useRef } from 'react';
import './Suspects.css';
import { useGameStore } from './useGameStore';
import { useNavigate } from 'react-router-dom';

// ── Tag config — dark colours that read on beige ──
const TAG_CONFIG = {
  neutral:    { label: "Neutral",    color: "#4a3f2f" },
  suspicious: { label: "Suspicious", color: "#c0392b" },
  cleared:    { label: "Cleared",    color: "#1e7e34" },
  alibi:      { label: "Alibi",      color: "#1a5296" },
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

// Sentinel — when selected, show case scratchpad
const CASE_NOTES_ID = '__case_notes__';

function Suspects() {
  const navigate = useNavigate();
  const { player } = useGameStore();
  const profiles = player?.characterProfiles ?? [];

  // Default to first suspect profile
  const [selectedId, setSelectedId] = useState<string>(
    profiles[0]?.id ?? CASE_NOTES_ID
  );

  const selectedSuspect = profiles.find(p => p.id === selectedId);
  const isCaseNotes = selectedId === CASE_NOTES_ID;

  // Per-suspect notes + tags
  const [suspectNotes, setSuspectNotes] = useState<SuspectNote[]>(
    profiles.map(p => ({
      suspectName: p.name,
      note: '',
      tag: 'neutral' as TagKey,
    }))
  );

  // Case scratchpad
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selectedId && profiles.length > 0) {
      setSelectedId(profiles[0].id);
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

          {/* ── Sidebar — fixed width, always rendered ── */}
          <div className="suspects-sidebar">

            <div className="sidebar-header">
              <h3>Suspects</h3>
            </div>

            {/* Case Notes — special entry at top */}
            <button
              className={`suspect-button case-notes-btn ${isCaseNotes ? 'active' : ''}`}
              onClick={() => setSelectedId(CASE_NOTES_ID)}
            >
              <span className="suspect-button-icon">📋</span>
              <span className="suspect-button-name">Case Notes</span>
            </button>

            <div className="sidebar-divider" />

            {/* Suspect list */}
            <div className="suspect-list">
              {profiles.map((suspect) => {
                const note = suspectNotes.find(n => n.suspectName === suspect.name);
                const isActive = selectedId === suspect.id;
                return (
                  <button
                    key={suspect.id}
                    className={`suspect-button ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedId(suspect.id)}
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

            {/* Nav */}
            <div className="sidebar-nav">
            <button onClick={() => navigate('/desk')}> ← Desk</button>
            </div>
          </div>

          {/* ── Main panel ── */}
          <div className="suspects-main">

            {/* ══ SUSPECT PROFILE ══ */}
            {!isCaseNotes && selectedSuspect && activeSuspectNote && (
              <>
                <div className="main-header">
                  <h3>Case Notepad</h3>
                </div>

                <div className="suspect-details-container">

                  <div className="suspect-name-section">
                    <h4>Name</h4>
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
                      <h4>Biodata</h4>
                      <ul>
                        <li>{selectedSuspect.personalityBlurb}</li>
                        <li><em>"{selectedSuspect.claimedAlibi}"</em></li>
                      </ul>

                      {/* Assessment */}
                      <div className="tag-row">
                        <span className="tag-row-label">Your Assessment:</span>
                        <div className="tag-btn-group">
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
                      </div>

                      {/* Notes */}
                      <div className="Notes-section">
                        <h4>Notes</h4>
                        <textarea
                          className="notepad-textarea"
                          placeholder={`Observations on ${selectedSuspect.name}…`}
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
              </>
            )}

            {/* ══ CASE SCRATCHPAD ══ */}
            {isCaseNotes && (
              <>
                <div className="main-header">
                  <h3>Case Scratchpad</h3>
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
                      <span>+ Add</span>
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
