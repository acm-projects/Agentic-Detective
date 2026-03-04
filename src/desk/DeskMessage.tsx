import './test.css'

function Message() {
  const itemStyle = {
    imageRendering: 'pixelated' as const,
    cursor: 'pointer',
    position: 'absolute' as const,
    filter: 'drop-shadow(8px 8px 0px rgba(0,0,0,0.1))' 
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      {/* 1. CLUE BOOK */}
      <img 
        className="evidence-item" 
        src="/cluebooknew.png" 
        alt="Clue Book" 
        style={{ ...itemStyle, width: '390px', top: '110px', left: '55%', transform: 'rotate(-20deg)' }} 
        onClick={() => alert("User's can access the clues they wrote.")}
      />

      {/* 2. CIGARETTE */}
      <img 
        src="/cigarette.png" 
        alt="Cigarette" 
        style={{ ...itemStyle, width: '320px', top: '5px', left: '5%', transform: 'rotate(-50deg)' }} 

      />

      {/* 3. CASE FILE */}
      <img 
        className='evidence-item'
        src="/case-file.png" 
        alt="Case File" 
        style={{ ...itemStyle, width: '490px', top: '270px', left: '5%', transform: 'rotate(-25deg)', zIndex: 10 }} 
        onClick={() => alert("Case briefing for user.")}
      />

      {/* 4. GUN */}
      <img 
        src="/gun.png" 
        alt="Gun" 
        style={{ ...itemStyle, width: '280px', top: '70px', left: '78%', transform: 'rotate(15deg)' }} 
      />

      {/* 5. NOTEBOOK */}
      <img 
        className='evidence-item'
        src="/notebook.png" 
        alt="Notebook" 
        style={{ ...itemStyle, width: '370px', top: '230px', left: '27%', transform: 'rotate(20deg)' }} 
        onClick={() => alert("Suspect page.")}
      />

      {/* 6. PENCIL */}
      <img 
        src="/pencil.png" 
        alt="Pencil" 
        style={{ ...itemStyle, width: '200px', top: '315px', left: '48%', transform: 'rotate(-3deg)' }} 
      />

      {/* 11. PLANT */}
      <img 
        src="/plant.png" 
        alt="Office Plant" 
        style={{ ...itemStyle, width: '300px', top: '2px', left: '35%', transform: 'rotate(360deg)' }}
      />

        {/* 12. PHONE */}
      <img 
        className='evidence-item'
        src="/cellphone5.png" 
        alt="Cellphone" 
        style={{ ...itemStyle, width: '360px', top: '310px', left: '70%', transform: 'rotate(40deg)', zIndex: 10 }} 
      />


    </div>
  );
}

export default Message;