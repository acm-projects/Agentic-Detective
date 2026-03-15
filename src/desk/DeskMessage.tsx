import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cluebookImg from './assets/cluebook.png';
import cigaretteImg from './assets/cigarette.png';
import caseFileImg from './assets/case-file.png';
import gunImg from './assets/gun.png';
import notebookImg from './assets/notebook.png';
import pencilImg from './assets/pencil.png';
import plantImg from './assets/plant.png';
import deskBgImg from './assets/desk-bg-new.png';
import LoadingScreen from '../LoadingScreen';
import CaseReportScreen from '../CaseReportScreen';
import phoneImg from './assets/cellphone7.webp';
import { useGameStore, useActiveHistory, useActiveSuspectProfile, useActiveSuspectStress } from '../useGameStore';
import './desk.css';

function Message() {
  const { phase, goToBriefing, makeAccusation, player } = useGameStore();
  const navigate = useNavigate();
  const profiles = player?.characterProfiles ?? [];
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
  }

  const handleSuspectClick = () => {
    navigate('/suspects');
  }

  const handleCaseFileClick = () => {
    navigate('/report');
  };

  return (
    <>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundImage: `url(${deskBgImg})`, backgroundSize: 'cover' }}>
        
        {/* 1. CLUE BOOK */}
        <img 
          className="evidence-item" 
          src={cluebookImg} 
          alt="Clue Book" 
          style={{ ...itemStyle, width: '390px', top: '110px', left: '55%', transform: 'rotate(-20deg)' }} 
          onClick={handleClueBookClick}
        />

        {/* 2. CIGARETTE */}
        <img 
          src={cigaretteImg} 
          alt="Cigarette" 
          style={{ ...itemStyle, width: '320px', top: '5px', left: '5%', transform: 'rotate(-50deg)' }} 

        />

        {/* 3. CASE FILE */}
        <img 
          className='evidence-item'
          src={caseFileImg} 
          alt="Case File" 
          style={{ ...itemStyle, width: '490px', top: '270px', left: '5%', transform: 'rotate(-25deg)', zIndex: 10 }} 
          onClick={handleCaseFileClick}
        />

        {/* 4. GUN */}
        <img 
          className='evidence-item'
          src={gunImg} 
          alt="Gun" 
          style={{ ...itemStyle, width: '280px', top: '70px', left: '78%', transform: 'rotate(15deg)' }}
          onClick={() => (document.getElementById('accuse') as HTMLDialogElement)?.showModal()} 
        />
        <dialog className="nes-dialog" id="accuse">
          <form method="dialog">
            <h3>Make Your Accusation</h3>
            <p>Who do you think did it?</p>
            {profiles.map(p => (
              <button key={p.name} onClick={() => makeAccusation(p.name, navigate)}>
                {p.name}
              </button>
            ))}
            <menu className="dialog-menu">
              <button>Cancel</button>
            </menu>
          </form>
        </dialog>

        {/* 5. NOTEBOOK */}
        <img 
          className='evidence-item'
          src={notebookImg} 
          alt="Notebook" 
          style={{ ...itemStyle, width: '370px', top: '230px', left: '27%', transform: 'rotate(20deg)' }} 
          onClick={handleSuspectClick}
        />

        {/* 6. PENCIL */}
        <img 
          src={pencilImg} 
          alt="Pencil" 
          style={{ ...itemStyle, width: '200px', top: '315px', left: '48%', transform: 'rotate(-3deg)' }} 
        />

        {/* 11. PLANT */}
        <img 
          src={plantImg} 
          alt="Office Plant" 
          style={{ ...itemStyle, width: '300px', top: '2px', left: '35%', transform: 'rotate(360deg)' }}
        />

        {/* 12. PHONE */}
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
    </>
  );
}

export default Message;