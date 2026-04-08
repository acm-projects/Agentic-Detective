import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../useGameStore';
import cluebookImg from './assets/themedcluebook.png';
import cigaretteImg from './assets/newthemedcigarette.png';
import caseFileImg from './assets/themedcasefile.png';
import gunImg from './assets/themedgun.png';
import handcuffs from '../../assets/handcuffs.png';
import pencilImg from './assets/themedpencil.png';
import plantImg from './assets/muchbetterthemedplant.png';
import deskBgImg from './assets/extranewdesk.png';
import LoadingScreen from '../LoadingScreen';
import CaseReportScreen from '../CaseReportScreen';
import phoneImg from './assets/2themedcellphone.png';
import './desk.css';
import ScrabbleImg from './assets/newscrabble.png'; 

function Message() {
  const { phase, goToBriefing, makeAccusation, player  } = useGameStore();
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
          style={{ ...itemStyle, width: '390px', top: '150px', left: '53%', transform: 'rotate(-20deg)' }} 
          onClick={handleClueBookClick}
        />

        {/* 2. CIGARETTE */}
        <img
          src={cigaretteImg} 
          alt="Cigarette" 
          style={{ ...itemStyle, width: '320px', top: '5px', left: '5%', transform: 'rotate(-50deg)' }} 

        />

        
        {/* 2. SCRABBLE */}
        <img 
          src={ScrabbleImg} 
          alt="Scrabble" 
          style={{ ...itemStyle, width: '340px', top: '1px', left: '67%'}} 

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
          src={gunImg} 
          alt="Gun" 
          style={{ ...itemStyle, width: '280px', top: '110px', left: '78%', transform: 'rotate(15deg)' }} 
        />

        {/* 5. NOTEBOOK */}
        <img 
          className='evidence-item'
          src={handcuffs} 
          alt="Notebook" 
          style={{ ...itemStyle, width: '370px', top: '230px', left: '33%', transform: 'rotate(-50deg)' }} 
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
          style={{ ...itemStyle, width: '330px', top: '-12px', left: '30%', transform: 'rotate(360deg)' }}
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