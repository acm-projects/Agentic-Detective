import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../useGameStore';
import { Tooltip } from '../components/tooltip/Tooltip';
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

interface DeskItemProps {
  src: string;
  alt: string;
  tooltip: string;
  className?: string;
  style: React.CSSProperties;
  onClick?: () => void;
}

function DeskItemWithTooltip({ src, alt, tooltip, className, style, onClick }: DeskItemProps) {
  return (
    <Tooltip<HTMLImageElement> content={tooltip} className="desk-tooltip" placement="bottom" offsetPx={3}>
      {({ ref, getReferenceProps }) => (
        <img
          className={className}
          src={src}
          alt={alt}
          style={style}
          ref={ref}
          {...getReferenceProps()}
          onClick={onClick}
        />
      )}
    </Tooltip>
  );
}

function Message() {
  const { phase } = useGameStore();
  const navigate = useNavigate();

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
        <DeskItemWithTooltip
          className="evidence-item" 
          src={cluebookImg} 
          alt="Clue Book" 
          tooltip="Clue Book: review discovered evidence."
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
        <DeskItemWithTooltip
          className='evidence-item'
          src={caseFileImg} 
          alt="Case File" 
          tooltip="Case File: open your report and briefing."
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
        <DeskItemWithTooltip
          className='evidence-item'
          src={notebookImg} 
          alt="Notebook" 
          tooltip="Notebook: inspect all suspect profiles."
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
          style={{ ...itemStyle, width: '330px', top: '-12px', left: '30%', transform: 'rotate(360deg)' }}
        />

        {/* 12. PHONE */}
      <DeskItemWithTooltip
        className='evidence-item'
          src={phoneImg} 
          alt="Cellphone" 
          tooltip="Cellphone: answer and continue interrogation."
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