import { useEffect, useState } from 'react';
import './LoadingScreen.css';
import vinyl from './assets/7logo.png';

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
            src={vinyl}
            alt="Loading"
            style={{
              width: '230px',
              height: '230px',
              transform: `rotate(${rotation}deg)`,
              filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
            }}
          />
        </div>
        <h2 className="loading-text">unlocking your case...</h2>
        <p className="loading-subtext">generating suspects and clues</p>
      </div>
    </div>
  );
}
