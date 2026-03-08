import './Suspects.css';

function Suspects() {
    return (
        <div className="suspects">
            <h1>Case Name</h1>
            <div className="case-header">
                <h3>Suspect Name</h3>
                <h3>Case Notepad</h3>
            </div>
            <div className="case-body">
                <div className="suspect-names">
                    <button>Suspect 1</button>
                    <button>Suspect 2</button>
                    <button>Suspect 3</button> 
                    <button>Suspect 4</button>
                    <button>Suspect 5</button>
                </div>
                <div className="character-profile">
                    <div className="character-stats">
                        <h6>Character Name</h6>
                        <div>  
                            <ul>
                                <li>Age: 35</li>
                                <li>Occupation: Chef</li>
                                <li>Relationship to Victim: Ex-Spouse</li>
                            </ul>
                        </div>
                    </div>
                    <div className="character-info">
                        <div className="polaroid">
                        <img src="../assets/Screenshot 2026-03-08 173326.png" alt="Mugshot" />
                        </div>
                        <div>
                            <h6>BioData</h6>
                            <ul>
                                <li>Blah</li>
                                <li>Blah</li>
                                <li>Blah</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Suspects;