import { useState } from 'react';
import './App.css';
import { useGameStore } from "./useGameStore";
import CaseReportScreen from "./CaseReportScreen";
import { Link } from 'react-router';
import NotesPage from "./NotesPage";

function NewGame() {
    const { seed, setSeed, startCase, phase } = useGameStore();

    const [personalization, setPersonalization] = useState('');
    const [timePeriod, setTimePeriod] = useState(10); // Default value
    const [intensity, setIntensity] = useState(5); // Default value
    const [difficulty, setDifficulty] = useState(5); // Default value
    
    if (phase === "generating") {return <div className="loading">Building your case...</div>}
    if (phase === "briefing") {return <CaseReportScreen />}
    if (phase === "investigation") {return <NotesPage />}

    

    return (
      <div className="container">
      <h1 className="title">Agentic Detective</h1>
      <p className="subtitle">Welcome to the game you create for yourself!</p>
      <input
        type="text"
        value={personalization}
        onChange={(e) => setPersonalization(e.target.value)}
        placeholder="Personalize your gameplay..."
        className="input"
      />
      <div className="slider-container">
        <label className="label">
          Time Period: {timePeriod} mins
        </label>
        <input
          type="range"
          min="5"
          max="90"
          step="5"
          value={timePeriod}
          onChange={(e) => setTimePeriod(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="slider-container">
        <label className="label">
          Intensity: {intensity}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={intensity}

          onChange={(e) => setIntensity(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="slider-container">
        <label className="label">Difficulty: {seed?.difficulty ?? 5}</label>
        <input
          type="range"
          min="1" max="10" step="1"
          value={seed?.difficulty ?? 5}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="slider"
        />
      </div>
        <button className="detective-button" onClick={()=>{
          setSeed({
            theme: personalization,        // "1920s jazz club", "remote Antarctic base", etc
            difficulty: difficulty,  // 1–10 slider ("on a scale of 1 to 10")
            duration: timePeriod,     // minutes: 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60
            intensity: intensity 
          }) 
          startCase()
        }} >
        Solve The Case!
      </button>
        <Link to="/interrogate" className="start-button">Start Game</Link>
    </div>
    );
}

export default NewGame;