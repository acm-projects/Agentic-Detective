import { useState, useEffect } from 'react';
import './Suspects.css';
import { useGameStore, useActiveHistory, useActiveSuspectProfile } from './useGameStore';
import { Link, useNavigate } from 'react-router-dom';

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

function Suspects() {
  const [selectedSuspect, setSelectedSuspect] = useState();
  const navigate = useNavigate();
  const { player, activeSuspectName } = useGameStore();
  const profiles = player?.characterProfiles ?? [];
  const activeProfile = useActiveSuspectProfile();

  useEffect(() => {
    if (!activeSuspectName && profiles.length > 0) {
      setSelectedSuspect(profiles[0].name);
    }
  }, []);


  return (
    <div className="suspects-wrapper">
      <div className="suspects-container">
        {/* Header */}
        <div className="suspects-header">
          <h1>{player.caseReport.caseTitle}</h1>
        </div>



        {/* Main Layout */}
        <div className="suspects-layout">
          {/* Left Sidebar - Suspect List */}
          <div className="suspects-sidebar">
            <div className="sidebar-header">
              <h3>{player.caseReport.caseTitle}</h3>
            </div>
            <div className="suspect-list">
              {profiles.map((suspect) => (
                <button
                  key={suspect?.id}
                  className={`suspect-button ${selectedSuspect?.id === suspect?.id ? 'active' : ''}`}
                  onClick={() => setSelectedSuspect(suspect)}
                >
                  {suspect.name}
                </button>
              ))}
            </div>
            <div>
              <br /> <br />
            </div>
            <button 
              className='back-button'
              onClick = {() => navigate("/interrogate")}>
                <span> ← </span>Return to Interrogation
            </button>
          </div>

          {/* Right Main Area - Suspect Details */}
          <div className="suspects-main">
            <div className="main-header">
              <h3>CASE NOTEPAD</h3>
            </div>

            <div className="suspect-details-container">
              {/* Name Section */}
              <div className="suspect-name-section">
                <h4>NAME</h4>
                <div className="suspect-info">
                  <p>{selectedSuspect?.name.toUpperCase()}</p>
                  <ul>
                    <li>Age: {selectedSuspect?.age}</li>
                    <li>Occupation: {selectedSuspect?.occupation}</li>
                    <li>Relationship to Victim: {selectedSuspect?.relationshipToVictim}</li>
                  </ul>
                </div>
              </div>

              {/* Polaroid Image and BioData Section */}
              <div className="suspect-biodata-section">
                {/* Polaroid Frame */}
                <div className="polaroid">
                  <div className="polaroid-content">
                    <img
                      src={`/avatars/${selectedSuspect?.avatarId}.png`}
                      alt={selectedSuspect?.name}
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="polaroid-label">{selectedSuspect?.name}</p>
                </div>

                {/* BioData Section */}
                <div className="biodata-section">
                  <h4>BIODATA</h4>
                  <ul>
                    <li>{selectedSuspect?.personalityBlurb}</li>
                    <li>"<em>{selectedSuspect?.claimedAlibi}</em>"</li>
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
                    <li>Suspicion: 
                      <span className={
                        `suspicion-tag suspicion-${selectedSuspect?.suspicionLevel}`}>
                          {selectedSuspect?.suspicionLevel.toUpperCase()}</span></li>
                  </ul>
                <div className="Notes-section">
                <h4>Notes</h4>

                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Suspects;