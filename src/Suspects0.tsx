import { useState, useEffect } from 'react';
import './Suspects.css';
import { useGameStore } from './useGameStore';
import { useNavigate } from 'react-router-dom';

// ── Tag config (from NotesPage) ──
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

function Suspects() {
  const navigate = useNavigate();
  const { player, goToBriefing, interrogateSuspects } = useGameStore();
  const profiles = player?.characterProfiles ?? [];

  // ── Selected suspect (UI from Suspects.tsx) ──
  const [selectedSuspect, setSelectedSuspect] = useState<typeof profiles[number] | undefined>(
    profiles[0]
  );

  // ── Per-suspect notes + tags (functionality from NotesPage) ──
  const [suspectNotes, setSuspectNotes] = useState<SuspectNote[]>(
    profiles.map(p => ({
      suspectName: p.name,
      note: '',
      tag: 'neutral' as TagKey,
    }))
  );

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

  const activeSuspectNote = suspectNotes.find(
    n => n.suspectName === selectedSuspect?.name
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

          {/* Left Sidebar — suspect list with tag dot */}
          <div className="suspects-sidebar">
            <button className="main-header" onClick={() => interrogateSuspects(navigate)}>
        <div className="back-button">
              CASE NOTEPAD
        </div>
        </button>

            <div className="suspect-list">
              {profiles.map((suspect) => {
                const note = suspectNotes.find(n => n.suspectName === suspect.name);
                return (
                  <button
                    key={suspect?.id}
                    className={`suspect-button ${selectedSuspect?.id === suspect?.id ? 'active' : ''}`}
                    onClick={() => setSelectedSuspect(suspect)}
                  >
                    <span>{suspect.name}</span>
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

            <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="back-button" onClick={() => navigate('/desk')}>
                ← Desk
              </button>
            </div>
          </div>

          {/* Right Main Area — suspect details + notes */}
          <div className="suspects-main">
           

            {selectedSuspect && activeSuspectNote ? (
              <div className="suspect-details-container">

                {/* Name / Info Section */}
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

                {/* Polaroid + Biodata */}
                <div className="suspect-biodata-section">

                  {/* Polaroid Frame */}
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

                  {/* Biodata */}
                  <div className="biodata-section">
                    <h4>BIODATA</h4>
                    <ul>
                      <li>{selectedSuspect.personalityBlurb}</li>
                      <li>
                        Claimed Alibi:
                        <em>"{selectedSuspect.claimedAlibi}"</em>
                      </li>
                    </ul>

                    {/* ── Tag assessment row (from NotesPage) ── */}
                    <div className="tag-row">
                      <span className="tag-row-label" >Your assessment:</span>
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

                    {/* ── Free-text notes (from NotesPage) ── */}
                    <div className="Notes-section">
                      <h4>Notes</h4>
                      <textarea
                        className="notepad-textarea"
                        placeholder={`Write your observations about ${selectedSuspect.name}…\n\nWhat did they say? What felt off? Any contradictions?`}
                        value={activeSuspectNote.note}
                        onChange={e =>
                          updateSuspectNote(selectedSuspect.name, { note: e.target.value })
                        }
                        rows={3}
                        />
                        <button className="tag-row-label tag-row" onClick={async () => {
                           const caseId = player?.caseReport?.caseId;
                           if (!caseId) return;
                           await fetch(`http://localhost:3000/case/${caseId}/suspectNotes`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              suspectName: selectedSuspect.name,
                              suspectNotes: activeSuspectNote.note,
                            }),
                           })
                        }}>
                          Save
                        </button>
                      
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Suspects;
