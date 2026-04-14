import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react'
import { useGameStore } from '../useGameStore';
import { Tooltip } from '../components/tooltip/Tooltip';
import cluebookImg from './assets/themedcluebook.png';
import cigaretteImg from './assets/newthemedcigarette.png';
import caseFileImg from './assets/themedcasefile.png';
import gunImg from './assets/themedgun.png';
import handcuffs from '../../assets/handcuffs.png';
// import notebookImg from './assets/notebook.png'
import pencilImg from './assets/themedpencil.png';
import plantImg from './assets/muchbetterthemedplant.png';
import deskBgImg from './assets/extranewdesk.png';
import LoadingScreen from '../LoadingScreen';
import phoneImg from './assets/2themedcellphone.png';
import TutorialModal from '../components/tutorial-modal/Tutorial';
import './desk.css';
import ScrabbleImg from './assets/newscrabble.png'; 

interface DeskItemProps {
  src: string;
  alt: string;
  tooltip: string;
  className?: string;
  style: React.CSSProperties;
  onClick?: () => void;
  tutorialId?: string;
}

function DeskItemWithTooltip({ src, alt, tooltip, className, style, onClick, tutorialId }: DeskItemProps) {
  return (
    <Tooltip<HTMLImageElement> content={tooltip} className="desk-tooltip" placement="bottom" offsetPx={3}>
      {({ ref, getReferenceProps }) => (
        <img
          className={className}
          src={src}
          alt={alt}
          style={style}
          ref={ref}
          data-tutorial-id={tutorialId}
          {...getReferenceProps()}
          onClick={onClick}
        />
      )}
    </Tooltip>
  );
}

function Message() {
  const TUTORIAL_KEY = 'tutorialSeen';
  const TUTORIAL_STEP_KEY = 'tutorialStep';
  const CASE_REPORT_STEP = 1;
  const ACCUSATION_STEP = 2;
  const EVIDENCE_REVIEW_STEP = 3;
  const INTERROGATION_STEP = 4;

  const { phase, player } = useGameStore();
  const navigate = useNavigate();
  const { isFirstClueDiscovery, clearFirstClueDiscovery } = useGameStore();

  const [suspectsOpen, setSuspectsOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(() => Number(localStorage.getItem(TUTORIAL_STEP_KEY) ?? -1));
  const [tutorialSeen, setTutorialSeen] = useState<boolean>(() => localStorage.getItem(TUTORIAL_KEY) === 'true');

  useEffect(() => {
    const syncTutorialState = () => {
      const nextStep = Number(localStorage.getItem(TUTORIAL_STEP_KEY) ?? -1);
      const nextSeen = localStorage.getItem(TUTORIAL_KEY) === 'true';

      setTutorialStep(prev => (prev !== nextStep ? nextStep : prev));
      setTutorialSeen(prev => (prev !== nextSeen ? nextSeen : prev));
    };

    syncTutorialState();
    const id = window.setInterval(syncTutorialState, 180);
    return () => window.clearInterval(id);
  }, []);

  const tutorialActiveOnDesk = !tutorialSeen;
  const highlightClueBookForTutorial = tutorialActiveOnDesk && tutorialStep === EVIDENCE_REVIEW_STEP;
  const highlightCaseFileForTutorial = tutorialActiveOnDesk && tutorialStep === CASE_REPORT_STEP;
  const highlightAccusationForTutorial = tutorialActiveOnDesk && tutorialStep === ACCUSATION_STEP;
  const highlightPhoneForTutorial = tutorialActiveOnDesk && tutorialStep === INTERROGATION_STEP;
  const tutorialHighlightClass = 'evidence-item-first-discovery';
  const baseItemClass = 'evidence-item';

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
    clearFirstClueDiscovery();
    navigate('/clues');
  };

  const handleCaseFileClick = () => {
    navigate('/report');
  };

  return (
    <>
      <TutorialModal />
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
        <div className='icons'>
          {/* 1. CLUE BOOK */}
          <DeskItemWithTooltip
            className={(isFirstClueDiscovery || highlightClueBookForTutorial) ? tutorialHighlightClass : baseItemClass}
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
            className={highlightCaseFileForTutorial ? tutorialHighlightClass : baseItemClass}
            src={caseFileImg} 
            alt="Case File" 
            tooltip="Case File: open your report and briefing."
            style={{ ...itemStyle, width: '490px', top: '270px', left: '5%', transform: 'rotate(-25deg)', zIndex: 10 }} 
            onClick={handleCaseFileClick}
            tutorialId='tutorial-case-file'
          />

          {/* 4. GUN */}
          <img 
            src={gunImg} 
            alt="Gun" 
            style={{ ...itemStyle, width: '280px', top: '110px', left: '78%', transform: 'rotate(15deg)' }} 
          />

          {/* 5. HANDCUFFS */}
          <DeskItemWithTooltip
            className={highlightAccusationForTutorial ? 'evidence-item-first-discovery' : 'evidence-item'}
            src={handcuffs} 
            alt="Accusation" 
            tooltip="Make your accusation here."
            style={{ ...itemStyle, width: '370px', top: '230px', left: '27%', transform: 'rotate(220deg)', zIndex: 10 }} 
            onClick={() => setSuspectsOpen(true)}
            tutorialId='tutorial-accusation'
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
          className={highlightPhoneForTutorial ? tutorialHighlightClass : baseItemClass}
            src={phoneImg} 
            alt="Cellphone" 
            tooltip="Cellphone: answer and continue interrogation."
            style={{ ...itemStyle, width: '360px', top: '310px', left: '70%', transform: 'rotate(40deg)', zIndex: 10 }}
            onClick={() => {
              handlePhoneClick();
            }}
        />
        </div>
      <div className='custom-message'>
        {isFirstClueDiscovery && (
          <div role="status" aria-live="polite">
            <p>First Clue Discovered</p>
            <p>
              <strong>Step 1:</strong> Click the highlighted Clue Book button above. <br /> <br />
              <strong>Step 2:</strong> Open the Clues page from the Clue Book to review your newly acquired evidence.
            </p>
          </div>
        )}
      </div>
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
            {/*<Suspects />*/}
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