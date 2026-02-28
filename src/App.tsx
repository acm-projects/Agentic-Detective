import { useGameStore } from "./useGameStore";
import CaseReportScreen from "./CaseReportScreen";
import './App.css';

function App() {
  const { seed, setSeed, startCase, phase } = useGameStore();

  if (phase === "generating") return <div className="loading">Building your case...</div>;
  if (phase === "briefing") return <CaseReportScreen />;

  return (
    <div className="container">
      <h1 className="title">Agentic Detective</h1>
      <p className="subtitle">Welcome to the game you create for yourself!</p>

      <input
        type="text"
        value={seed?.freeText ?? ''}
        onChange={(e) => setSeed({ freeText: e.target.value, theme: e.target.value })}
        placeholder="Personalize your gameplay..."
        className="input"
      />

      <div className="slider-container">
        <label className="label">Time Period: {seed?.duration ?? 20} mins</label>
        <input
          type="range"
          min="5" max="60" step="5"
          value={seed?.duration ?? 20}
          onChange={(e) => setSeed({ duration: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="slider-container">
        <label className="label">Intensity: {seed?.intensity ?? 5}</label>
        <input
          type="range"
          min="1" max="10" step="1"
          value={seed?.intensity ?? 5}
          onChange={(e) => setSeed({ intensity: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="slider-container">
        <label className="label">Difficulty: {seed?.difficulty ?? 5}</label>
        <input
          type="range"
          min="1" max="10" step="1"
          value={seed?.difficulty ?? 5}
          onChange={(e) => setSeed({ difficulty: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <button className="detective-button" onClick={startCase}>
        Solve The Case!
      </button>
    </div>
  );
}

export default App;