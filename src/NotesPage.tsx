import { useState, useRef } from "react";
import { useGameStore } from "./useGameStore";
import "./NotesPage.css";

// ── Types ──
interface SuspectNote {
  suspectName: string;
  avatarId: string;
  note: string;
  tag: "neutral" | "suspicious" | "cleared" | "alibi";
}

interface CaseNote {
  id: number;
  text: string;
  pinned: boolean;
  timestamp: string;
}

const TAG_CONFIG = {
  neutral:    { label: "Neutral",    color: "#4a3f2f" },
  suspicious: { label: "Suspicious", color: "#8b1a1a" },
  cleared:    { label: "Cleared",    color: "#1a4a2f" },
  alibi:      { label: "Alibi",      color: "#1a2f4a" },
};

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NotesPage() {
  const { player } = useGameStore();
  const profiles = player?.characterProfiles ?? [];
  const caseReport = player?.caseReport;

  // ── Suspect notes — one per character ──
  const [suspectNotes, setSuspectNotes] = useState<SuspectNote[]>(
    profiles.map(p => ({
      suspectName: p.name,
      avatarId: p.avatarId,
      note: "",
      tag: "neutral" as const,
    }))
  );

  // ── Case notes — free-form scratchpad ──
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState<"suspects" | "case">("suspects");
  const [activeSuspect, setActiveSuspect] = useState<string>(profiles[0]?.name ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setNewNote("");
  };

  const togglePin = (id: number) => {
    setCaseNotes(prev =>
      prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)
    );
  };

  const deleteNote = (id: number) => {
    setCaseNotes(prev => prev.filter(n => n.id !== id));
  };

  const activeSuspectNote = suspectNotes.find(n => n.suspectName === activeSuspect);
  const sortedCaseNotes = [...caseNotes].sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );

  return (
    <div className="notes-overlay">
      <div className="notes-document">

        {/* ── Header ── */}
        <div className="notes-header">
          <div className="notes-agency">Agentic Detective Bureau · Field Notes</div>
          <h1 className="notes-title">
            {caseReport?.caseTitle ?? "Case Notes"}
          </h1>
          <div className="notes-case-id">{caseReport?.caseId ?? ""}</div>
        </div>

        {/* ── Tabs ── */}
        <div className="notes-tabs">
          <button
            className={`notes-tab ${activeTab === "suspects" ? "active" : ""}`}
            onClick={() => setActiveTab("suspects")}
          >
            Suspect Profiles
          </button>
          <button
            className={`notes-tab ${activeTab === "case" ? "active" : ""}`}
            onClick={() => setActiveTab("case")}
          >
            Case Scratchpad
          </button>
          <div className="notes-tab-ink" />
        </div>

        {/* ══════════════════════════════════
            TAB 1 — SUSPECT NOTES
        ══════════════════════════════════ */}
        {activeTab === "suspects" && (
          <div className="suspects-layout">

            {/* Sidebar: suspect list */}
            <div className="suspects-sidebar">
              {profiles.map(p => {
                const note = suspectNotes.find(n => n.suspectName === p.name);
                const isActive = activeSuspect === p.name;
                return (
                  <button
                    key={p.name}
                    className={`suspect-tab-btn ${isActive ? "active" : ""} tag-${note?.tag ?? "neutral"}`}
                    onClick={() => setActiveSuspect(p.name)}
                  >
                    <div className="suspect-tab-avatar">
                      <img
                        src={`/avatars/${p.avatarId}.png`}
                        alt={p.name}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="suspect-tab-initial">
                        {p.name.charAt(0)}
                      </span>
                    </div>
                    <div className="suspect-tab-info">
                      <div className="suspect-tab-name">{p.name}</div>
                      <div className="suspect-tab-occupation">{p.occupation}</div>
                    </div>
                    {note?.tag !== "neutral" && (
                      <div
                        className="suspect-tag-dot"
                        style={{ background: TAG_CONFIG[note?.tag ?? "neutral"].color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main: active suspect notepad */}
            {activeSuspectNote && (() => {
              const profile = profiles.find(p => p.name === activeSuspect);
              if (!profile) return null;
              return (
                <div className="suspect-notepad">

                  {/* Suspect info card */}
                  <div className="suspect-info-card">
                    <div className="suspect-avatar-large">
                      <img
                        src={`/avatars/${profile.avatarId}.png`}
                        alt={profile.name}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span className="suspect-avatar-fallback">{profile.name.charAt(0)}</span>
                    </div>
                    <div className="suspect-info-text">
                      <h2 className="suspect-info-name">{profile.name}</h2>
                      <div className="suspect-info-meta">
                        {profile.age} · {profile.occupation}
                      </div>
                      <div className="suspect-info-relation">
                        {profile.relationshipToVictim}
                      </div>
                      <div className="suspect-info-alibi">
                        <span className="alibi-label">Claims: </span>
                        {profile.claimedAlibi}
                      </div>
                    </div>
                    {/* Suspicion badge */}
                    <div className={`suspicion-badge suspicion-${profile.suspicionLevel}`}>
                      {profile.suspicionLevel}
                    </div>
                  </div>

                  {/* Tag selector */}
                  <div className="tag-row">
                    <span className="tag-row-label">Your assessment:</span>
                    {(Object.keys(TAG_CONFIG) as Array<keyof typeof TAG_CONFIG>).map(tag => (
                      <button
                        key={tag}
                        className={`tag-btn ${activeSuspectNote.tag === tag ? "active" : ""}`}
                        style={{
                          "--tag-color": TAG_CONFIG[tag].color,
                        } as React.CSSProperties}
                        onClick={() => updateSuspectNote(activeSuspect, { tag })}
                      >
                        {TAG_CONFIG[tag].label}
                      </button>
                    ))}
                  </div>

                  {/* Notes textarea */}
                  <div className="notepad-area">
                    <div className="notepad-label">Field Notes</div>
                    <textarea
                      className="notepad-textarea"
                      placeholder={`Write your observations about ${profile.name}…\n\nWhat did they say? What felt off? Any contradictions?`}
                      value={activeSuspectNote.note}
                      onChange={e => updateSuspectNote(activeSuspect, { note: e.target.value })}
                      rows={10}
                    />
                    <div className="notepad-char-count">
                      {activeSuspectNote.note.length} chars
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════
            TAB 2 — CASE SCRATCHPAD
        ══════════════════════════════════ */}
        {activeTab === "case" && (
          <div className="case-scratchpad">

            {/* Input row */}
            <div className="scratchpad-input-row">
              <textarea
                ref={textareaRef}
                className="scratchpad-input"
                placeholder="Add a case note… a theory, a connection, a clue observation"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addCaseNote();
                }}
                rows={3}
              />
              <button className="scratchpad-add-btn" onClick={addCaseNote}>
                <span>+ Add Note</span>
                <span className="scratchpad-hint">⌘↵</span>
              </button>
            </div>

            {/* Notes list */}
            <div className="scratchpad-list">
              {sortedCaseNotes.length === 0 && (
                <div className="scratchpad-empty">
                  No notes yet. Start writing your theories…
                </div>
              )}
              {sortedCaseNotes.map(note => (
                <div
                  key={note.id}
                  className={`scratchpad-note ${note.pinned ? "pinned" : ""}`}
                >
                  {note.pinned && <div className="pin-indicator">📌</div>}
                  <p className="scratchpad-note-text">{note.text}</p>
                  <div className="scratchpad-note-footer">
                    <span className="scratchpad-note-time">{note.timestamp}</span>
                    <div className="scratchpad-note-actions">
                      <button
                        className="note-action-btn"
                        onClick={() => togglePin(note.id)}
                        title={note.pinned ? "Unpin" : "Pin"}
                      >
                        {note.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="note-action-btn delete"
                        onClick={() => deleteNote(note.id)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
