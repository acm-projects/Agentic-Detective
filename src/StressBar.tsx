import './StressBar.css'

interface StressBarProps {
  level: number; // 0–100
}

function stressLabel(level: number) {
  if (level <= 25) return { label: 'Calm',     color: '#4caf50' };
  if (level <= 50) return { label: 'Uneasy',   color: '#ffeb3b' };
  if (level <= 75) return { label: 'Rattled',  color: '#ff9800' };
  if (level <  100) return { label: 'Breaking', color: '#f44336' };
  return               { label: 'Broken',    color: '#9c27b0' };
}

export function StressBar({ level }: StressBarProps) {
  const { label, color } = stressLabel(level);

  return (
        <>
      <div className="stress-bar-header">
        <span className="stress-bar-title">Stress</span>
        <span className="stress-bar-label" style={{ color }}>{label}</span>
      </div>
      <div className="stress-bar-track">
        <div
          className="stress-bar-fill"
          style={{
            width: `${level}%`,
            backgroundColor: color,
            transition: 'width 0.6s ease, background-color 0.6s ease',
          }}
        />
      </div>
      </>
  );
}