import { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 6) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-spinner">
          <img
            src="https://static.vecteezy.com/system/resources/previews/036/397/995/large_2x/ai-generated-otter-isolated-on-transparent-background-png.png"
            alt="Loading"
            style={{
              width: '150px',
              height: '150px',
              transform: `rotate(${rotation}deg)`,
              filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
            }}
          />
        </div>
        <h2 className="loading-text">Building your case...</h2>
        <p className="loading-subtext">Generating suspects and clues</p>
      </div>
    </div>
  );
}
