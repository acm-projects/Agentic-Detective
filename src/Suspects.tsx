import './Suspects.css';
import { useGameStore, useActiveSuspectProfile } from './useGameStore';
import { useNavigate } from 'react-router';

function Suspects() {
  const navigate = useNavigate();

  const {
    player,
    activeSuspectName,
    startInterrogation
  } = useGameStore();

  const activeProfile = useActiveSuspectProfile();
  const profiles = player?.characterProfiles ?? [];

  return (
    <div className="suspects-wrapper">
      <div className="suspects-container">

        {/* Header */}
        <div className="suspects-header">
          <h1>{player?.caseReport?.caseTitle}</h1>
        </div>

        {/* Main Layout */}
        <div className="suspects-layout">

          {/* Left Sidebar */}
          <div className="suspects-sidebar">
            <div className="sidebar-header">
              <h3>SUSPECT PAGE</h3>
            </div>

            <div className="suspect-list">
              {profiles.map((suspect) => (
                <button
                  key={suspect.name}
                  className={`suspect-button ${
                    activeSuspectName === suspect.name ? 'active' : ''
                  }`}
                  onClick={() => startInterrogation(suspect.name)}
                >
                  {suspect.name}
                </button>
              ))}
            </div>

            <div>
              <br /><br />
            </div>

            <button
              className="back-button"
              onClick={() => navigate("/interrogate")}
            >
              <span> ← </span>Return to Interrogation
            </button>

            <button
              className="back-button"
              onClick={() => navigate("/desk")}
            >
              <span> ← </span>Return to Desk
            </button>
          </div>

          {/* Right Panel */}
          <div className="suspects-main">
            <div className="main-header">
              <h3>CASE NOTEPAD</h3>
            </div>

            <div className="suspect-details-container">

              {/* Name Section */}
              <div className="suspect-name-section">
                <h4>NAME</h4>

                <div className="suspect-info">
                  <p>{activeProfile?.name?.toUpperCase()}</p>

                  <ul>
                    <li>Age: {activeProfile?.age}</li>
                    <li>Occupation: {activeProfile?.occupation}</li>
                    <li>Relationship to Victim: {activeProfile?.relationshipToVictim}</li>
                  </ul>
                </div>
              </div>

              {/* Polaroid + Bio */}
              <div className="suspect-biodata-section">

                {/* Polaroid */}
                <div className="polaroid">
                  <div className="polaroid-content">
                    <img
                      src={`/avatars/${activeProfile?.avatarId}.png`}
                      alt={activeProfile?.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <p className="polaroid-label">
                    {activeProfile?.name}
                  </p>
                </div>

                {/* Biodata */}
                <div className="biodata-section">
                  <h4>BIODATA</h4>

                  <ul>
                    <li>{activeProfile?.personalityBlurb}</li>

                    <li>
                      "<em>{activeProfile?.claimedAlibi}</em>"
                    </li>

                    <li>
                      Suspicion:
                      <span
                        className={`suspicion-tag suspicion-${activeProfile?.suspicionLevel}`}
                      >
                        {activeProfile?.suspicionLevel?.toUpperCase()}
                      </span>
                    </li>
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

