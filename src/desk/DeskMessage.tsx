import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../useGameStore';
import cluebookImg from './assets/themedcluebook.png';
import cigaretteImg from './assets/newthemedcigarette.png';
import caseFileImg from './assets/themedcasefile.png';
import gunImg from './assets/themedgun.png';
import notebookImg from './assets/themednotebook.png';
import pencilImg from './assets/themedpencil.png';
import plantImg from './assets/muchbetterthemedplant.png';
import deskBgImg from './assets/extranewdesk.png';
import LoadingScreen from '../LoadingScreen';
import phoneImg from './assets/2themedcellphone.png';
import './desk.css';
import ScrabbleImg from './assets/newscrabble.png';


function Message() {
  const { phase, goToBriefing, makeAccusation, player } = useGameStore();
  const navigate = useNavigate();
  const profiles = player?.characterProfiles ?? [];

  const [suspectsOpen, setSuspectsOpen] = useState(false);

  const caseCode = player?.caseReport?.caseId;
  if (phase === 'generating') {
    return <LoadingScreen />;
  }

  const itemStyle = {
    imageRendering: "pixelated" as const,
    cursor: "pointer",
    position: "absolute" as const,
    filter: "drop-shadow(8px 8px 0px rgba(0,0,0,0.1))"
  };

  const handlePhoneClick = () => {
    navigate('/interrogate');
  };

  const handleClueBookClick = () => {
    navigate('/clues');
  };

  const handleCaseFileClick = () => {
    navigate('/report');
  };

  return (
    <>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundImage: `url(${deskBgImg})`, backgroundSize: 'cover' }}>
        {caseCode && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '18px',
            zIndex: 10001,
            background: 'rgba(10,10,10,0.78)',
            color: '#fff',
            border: '1px solid #ffffff66',
            padding: '8px 10px',
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            fontFamily: 'Press Start 2P, cursive'
          }}>
            CASE ID: {caseCode}
          </div>
        )}
        
        {/* 1. CLUE BOOK */}
        <img
          className="evidence-item"
          src={cluebookImg}
          alt="Clue Book"
          style={{ ...itemStyle, width: '390px', top: '150px', left: '53%', transform: 'rotate(-20deg)' }}
          onClick={handleClueBookClick}
        />

        {/* 2. CIGARETTE */}
        <img
          src={cigaretteImg}
          alt="Cigarette"
          style={{ ...itemStyle, width: '320px', top: '5px', left: '5%', transform: 'rotate(-50deg)' }}
        />

        {/* 3. SCRABBLE */}
        <img
          src={ScrabbleImg}
          alt="Scrabble"
          style={{ ...itemStyle, width: '340px', top: '1px', left: '67%' }}
        />

        {/* 4. CASE FILE */}
        <img
          className='evidence-item'
          src={caseFileImg}
          alt="Case File"
          style={{ ...itemStyle, width: '490px', top: '270px', left: '5%', transform: 'rotate(-25deg)', zIndex: 10 }}
          onClick={handleCaseFileClick}
        />

        {/* 5. GUN */}
        <img
          src={gunImg}
          alt="Gun"
          style={{ ...itemStyle, width: '280px', top: '110px', left: '78%', transform: 'rotate(15deg)' }}
        />

        {/* 6. NOTEBOOK — opens suspects modal */}
        <img
          className='evidence-item'
          src={notebookImg}
          alt="Notebook"
          style={{ ...itemStyle, width: '370px', top: '230px', left: '27%', transform: 'rotate(20deg)', zIndex: 1 }}
          onClick={() => setSuspectsOpen(true)}
        />

        {/* 7. PENCIL */}
        <img
          src={pencilImg}
          alt="Pencil"
          style={{ ...itemStyle, width: '200px', top: '315px', left: '48%', transform: 'rotate(-3deg)' }}
        />

        {/* 8. PLANT */}
        <img
          src={plantImg}
          alt="Office Plant"
          style={{ ...itemStyle, width: '330px', top: '-12px', left: '30%', transform: 'rotate(360deg)' }}
        />

        {/* 9. PHONE */}
        <img
          className='evidence-item'
          src={phoneImg}
          alt="Cellphone"
          style={{ ...itemStyle, width: '360px', top: '310px', left: '70%', transform: 'rotate(40deg)', zIndex: 10 }}
          onClick={() => {
            const audio = new Audio("http://localhost:5555/api/voice");
            audio.play();
            handlePhoneClick();
          }}
        />
      </div>

      {/* ── Suspects Modal Overlay ── */}
      {suspectsOpen && (
        <>
          {/* Dimmed backdrop — click to close */}
          <div
            onClick={() => setSuspectsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 100,
              animation: 'fadeIn 0.2s ease',
            }}
          />

          {/* Modal panel */}
          <div
            style={{
              position: 'fixed',
              top: '4vh',
              left: '4vw',
              width: '92vw',
              height: '92vh',
              zIndex: 101,
              animation: 'slideUp 0.25s ease',
              overflow: 'hidden',
              border: '4px solid #111',
              boxShadow: '6px 6px 0 #111',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSuspectsOpen(false)}
              style={{
                position: 'absolute',
                top: '0.6em',
                right: '0.75em',
                zIndex: 102,
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.5rem',
                background: '#111',
                color: '#fff',
                border: '3px solid #fff',
                boxShadow: '3px 3px 0 #111',
                padding: '0.5em 0.8em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              ✕ Close
            </button>

            {/* Suspects component rendered inside modal */}
            <Suspects />
          </div>
        </>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export default Message;