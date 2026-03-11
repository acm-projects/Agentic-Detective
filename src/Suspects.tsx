import { useState, useEffect } from 'react';
import './Suspects.css';
import { useGameStore, useActiveHistory, useActiveSuspectProfile } from './useGameStore';

function Suspects() {
  const [selectedSuspect, setSelectedSuspect] = useState();
  const { player, activeSuspectName, isResponding, startInterrogation, proceedToInvestigation, sendMessage, makeAccusation, goToBriefing } = useGameStore();
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
          <h1>THE STUDY OF SHADOWS</h1>
        </div>

        {/* Main Layout */}
        <div className="suspects-layout">
          {/* Left Sidebar - Suspect List */}
          <div className="suspects-sidebar">
            <div className="sidebar-header">
              <h3>SUSPECT PAGE</h3>
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
                  <p>{activeProfile?.name.toUpperCase()}</p>
                  <ul>
                    <li>Age: {activeProfile?.age}</li>
                    <li>Occupation: {activeProfile?.occupation}</li>
                    <li>Relationship to Victim: {activeProfile?.relationshipToVictim}</li>
                  </ul>
                </div>
              </div>

              {/* Polaroid Image and BioData Section */}
              <div className="suspect-biodata-section">
                {/* Polaroid Frame */}
                <div className="polaroid">
                  <div className="polaroid-content">
                    <img
                      src={`/avatars/${activeProfile?.avatarId}.png`}
                      alt={activeProfile?.name}
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="polaroid-label">{activeProfile?.name}</p>
                </div>

                {/* BioData Section */}
                <div className="biodata-section">
                  <h4>BIODATA</h4>
                  <ul>
                    <li>{activeProfile?.personalityBlurb}</li>
                    <li>"<em>{activeProfile?.claimedAlibi}</em>"</li>
                    <li>Suspicion: <span className={`suspicion-tag suspicion-${activeProfile?.suspicionLevel}`}>{activeProfile?.suspicionLevel.toUpperCase()}</span></li>
                  </ul>
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