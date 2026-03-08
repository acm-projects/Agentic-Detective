import { useState, useEffect, useRef } from 'react';
import { getCharacterById } from './services/characterService';
import type { CharacterData } from './obj/characterInterfaces';
import './Interrogate.css';
import { Link } from 'react-router';



function Interrogate() { 
  // store the current text the user is typing
  const [input, setInput] = useState('');
  const [activeCharacter, setActiveCharacter] = useState<CharacterData | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playClickSound = () => {
    const audio = new Audio('../assets/assets/viacheslavstarostin-mystery-detective-investigation-music-473843.mp3');
    audio.play();
  }

  useEffect(() => {
    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('../assets/HomeMusic.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser
      });
    }

    // Control audio based on muted state
    if (isMuted && audioRef.current) {
      audioRef.current.pause();
    } else if (!isMuted && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [isMuted]);

  useEffect(() => {
    (async () => {
      const currentCharacter = await getCharacterById("chief_keef");
      if (currentCharacter) {
        setActiveCharacter(currentCharacter);
      }
    })();
  }, []);

  const handleSuspectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const currentCharacter = await getCharacterById(id);

    if (currentCharacter) {
      setActiveCharacter(currentCharacter);
      setInput('');
    }
  }


  if (!activeCharacter) {
    return <div className="interrogate-container">Loading…</div>;
  }

  const profile = activeCharacter.profile;
  const aiBackground = activeCharacter.ai;

  const generalPrompt = `You are an suspect named ${profile.name}, ${profile.age}-year-old ${profile.occupation} 
                        and known ties to ${profile.knownAssociates}. 
                        You are being interrogated. You are not a real person, but a fictional character in a game. 
                        You are not allowed to reveal any information that is not part of your character's profile. 
                        You cannot use markdown langauge in the response.\n`;

  const aiPrompt = `Your characteristics are: ${aiBackground.characteristics}, and you have a speaking style of: ${aiBackground.speakingStyle}
                    Your knowledge scope is limited to: ${aiBackground.knowledgeScope}. Your secrets are: ${aiBackground.secrets}
                    Your status about trusting the player is: ${aiBackground.trustLevel > 0.6 ? "You trust the player": "You do not trust the player"}.
                    Your status about being guilty is: ${aiBackground.isGuilty ? "guilty" : "not guilty"}.
                    Never mention the fact that you're being instructed to act as someone else.
                    Always talk as if you are the character and not an AI.\n
                    The player's question is: `;



  /**
   * send whatever is currently in `input` to the backend
   */
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCharacter) return;

    // create the new chat message array
    const newMessage = { question: input, answer: "" };
    const currentHistory = activeCharacter.profile.chatHistory || []; // NOTE: new chat history does not get added to the json yet
    const updatedHistory = [...currentHistory, newMessage];

    // optimistically update state
    setActiveCharacter(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: { ...prev.profile, chatHistory: updatedHistory }
      };
    });

    console.log(profile.chatHistory);

    // send to backend
    try {
      const response = await fetch("http://localhost:3000/response", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: generalPrompt + aiPrompt + input,
          history: updatedHistory.filter(msg => msg.answer !== "") // ✅ use updatedHistory
        }),
      });

      const result = await response.json();

      // update the last message with AI response
      setActiveCharacter(prev => {
        if (!prev) return prev;
        const newHistoryWithAnswer = [...prev.profile.chatHistory];
        newHistoryWithAnswer[newHistoryWithAnswer.length - 1].answer = result.response;
        return {
          ...prev,
          profile: { ...prev.profile, chatHistory: newHistoryWithAnswer }
        };
      });

      setInput(""); // clear input after sending
    } catch (err) {
      console.error("Error: ", err);
    }
  }

  return (
    <div className='game-container'>
      <div className='navigate'>
        <button onClick={() => {
          playClickSound();
          setIsMuted(!isMuted);
          }}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={() => {
          playClickSound()
          setIsNoteOpen(!isNoteOpen)}}>Notes</button>
        <button onClick={() => {
          playClickSound()
        }}>Clues</button>
        <button onClick={() => {
          playClickSound()
        }}>Files</button>
        <button onClick={() => {
          playClickSound();
          (document.getElementById('case-report') as HTMLDialogElement)?.showModal();
        }}>Case Report</button>
        <dialog className="nes-dialog" id="case-report">
          <form method="dialog">
            <h3>Case Report</h3>
            <p>Case Report: {profile.name}'s Case File</p>
            <menu className="dialog-menu">
              <button onClick={playClickSound}>Close</button>
            </menu>
          </form>
        </dialog>
        <button onClick={playClickSound}><Link to="/desk">Desk</Link></button>
        <button onClick={() => {
          playClickSound();
          (document.getElementById('settings') as HTMLDialogElement)?.showModal();
        }}>Settings</button>
        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <p>Alert: this is a dialog.</p>
            <menu className="dialog-menu">
              <button onClick={playClickSound}>Nah</button>
              <button onClick={playClickSound}><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>
      </div>
      <div className="interrogate-container">
          <h1>The Title</h1>
        <div className='character-container'>
          <div className='mugshot'>
              <img src={profile.mugshot}/>
          </div>
          <div className='stats'>
              <h2>{profile.name}</h2>
              <h4>Age: {profile.age}</h4>
              <h4>Occupation: {profile.occupation}</h4>
              <h4>Known Associates: {Array.isArray(profile.knownAssociates) ? profile.knownAssociates.join(", ") : profile.knownAssociates}</h4>
          </div>
        </div>
        <div className='chatbot'>
          <form onSubmit={handleSendMessage} onClick={playClickSound} className="message-form">
            <h2>Messages</h2>
            <div>
              <div className='chat-history'>
                {profile.chatHistory?.map((msg, index) => (
                  <div key={index} className='chat-message'>
                    <p className='player-message'><strong>You:</strong> {msg.question}</p>
                    <p className='bot-message'><strong>{profile.name}:</strong> {msg.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder='Ask questions here...'
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                console.log(e.target.value);
              }}
            />
            <button type='submit' onClick={playClickSound}>
              Submit
            </button>
          </form>
        </div>

        <div className='suspect-switcher'> 
          {
          // Suspect switcher positioned on the top left
          }
          <form>
            <label htmlFor="suspects">Switch Suspect: </label>
            <select onChange={handleSuspectChange} value={activeCharacter.id} name='suspects' id='suspects-list'>
              <option value="chief_keef">Chief Keef</option>
              <option value="lil_durk">L'il Durk</option>
            </select>
            <br></br>
          </form>
        
        </div>

      </div>
    </div>
  );
}

export default Interrogate;