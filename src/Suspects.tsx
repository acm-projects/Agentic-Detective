import { useState } from 'react';
import './Suspects.css';

const dummySuspects = [
  {
    id: 1,
    name: "Vikram Singh",
    age: 45,
    occupation: "Businessman",
    relationshipToVictim: "Business Rival",
    personalityBlurb: "Ambitious, volatile, and prone to outbursts. He carries a heavy burden of past grievances.",
    claimedAlibi: "I was at the bar across town the entire evening.",
    suspicionLevel: "high",
    avatarId: "avatar_02"
  },
  {
    id: 2,
    name: "Priya Sharma",
    age: 28,
    occupation: "Art Curator",
    relationshipToVictim: "Niece",
    personalityBlurb: "Reserved, observant, and carries a quiet sadness. She is often overlooked but misses little.",
    claimedAlibi: "I retired to my room with a headache before the commotion started.",
    suspicionLevel: "medium",
    avatarId: "avatar_01"
  },
  {
    id: 3,
    name: "Arjun Mehta",
    age: 38,
    occupation: "Real Estate Developer",
    relationshipToVictim: "Business Associate",
    personalityBlurb: "Smooth-talking, ambitious, and outwardly charming, but with a calculating edge.",
    claimedAlibi: "I was admiring the art collection in the west wing.",
    suspicionLevel: "medium",
    avatarId: "avatar_03"
  },
  {
    id: 4,
    name: "Dr. Ananya Rao",
    age: 55,
    occupation: "Doctor",
    relationshipToVictim: "Family Friend",
    personalityBlurb: "Calm, collected, and professional, but with a hint of weariness. She speaks with precision.",
    claimedAlibi: "I was in my private study reviewing patient files.",
    suspicionLevel: "low",
    avatarId: "avatar_04"
  }
];

function Suspects() {
  const [selectedSuspect, setSelectedSuspect] = useState(dummySuspects[0]);

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
              {dummySuspects.map((suspect) => (
                <button
                  key={suspect.id}
                  className={`suspect-button ${selectedSuspect.id === suspect.id ? 'active' : ''}`}
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
                  <p>{selectedSuspect.name}</p>
                  <ul>
                    <li>Age: {selectedSuspect.age}</li>
                    <li>Occupation: {selectedSuspect.occupation}</li>
                    <li>Relationship to Victim: {selectedSuspect.relationshipToVictim}</li>
                  </ul>
                </div>
              </div>

              {/* Polaroid Image and BioData Section */}
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

                {/* BioData Section */}
                <div className="biodata-section">
                  <h4>BIODATA</h4>
                  <ul>
                    <li>{selectedSuspect.personalityBlurb}</li>
                    <li>"<em>{selectedSuspect.claimedAlibi}</em>"</li>
                    <li>Suspicion: <span className={`suspicion-tag suspicion-${selectedSuspect.suspicionLevel}`}>{selectedSuspect.suspicionLevel.toUpperCase()}</span></li>
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