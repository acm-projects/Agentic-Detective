import { useState } from 'react';
import './Interrogate.css';
import { Link } from 'react-router';

interface ChatMessage {
  question: string;
  answer: string;
}

interface CharacterData {
    mugshot: string;
    name: string;
    stats: {
        Age: number;
        Occupation: string;
        "Known Associates": string;
        Chathistory: ChatMessage[];
    };
}

interface NoteInterface{
    shown: boolean;
    content: string[];
}

function Interrogate() {
  
  // store the current text the user is typing
  const [input, setInput] = useState('');
  const [data, setData] = useState<CharacterData>({
    mugshot: "https://ih1.redbubble.net/image.5653390764.7646/raf,360x360,075,t,fafafa:ca443f4786.u1.jpg",
    name: "Cheif Keef",
    stats: {
        "Age": 35,
        "Occupation": "Rapper",
        "Known Associates": "Lil Durk, Young Chop",
        "Chathistory": []
    }
})
const [notes, setNotes] = useState<string[]>([]);
const [isNoteOpen, setIsNoteOpen] = useState(false);


const generalPrompt = `You are an suspect named ${data.name}, ${data.stats.Age}-year-old ${data.stats.Occupation} and known ties to ${data.stats["Known Associates"]}, You are being interrogated. You are not a real person, but a fictional character in a game. You are not allowed to reveal any information that is not part of your character's profile. You cannot use markdown langauge in the response`;

  /**
   * send whatever is currently in `input` to the backend
   */
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return; // Don't send empty messages
    setInput('');
    console.log("Submitting question:", input);
    setData(prevData => ({
        ...prevData,
        stats: {
            ...prevData.stats,
            Chathistory: [...prevData.stats.Chathistory, { question: input, answer: "" }]
        }
    }));

    try {

      const response = await fetch("http://localhost:3000/response", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: generalPrompt + input, 
                               history: data.stats.Chathistory.filter(msg => msg.answer !== "")
        }),
      });

      const result = await response.json();

      setData(prev => {
        const updatedHistory = [...prev.stats.Chathistory];
        updatedHistory[updatedHistory.length - 1].answer = result.response;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            Chathistory: updatedHistory
          }
        };
      });
    } catch (err) {
      console.log("Error: ", err);
    }
  }

  return (
    <div className='game-container'>
      <div className='navigate'>
        <button onClick={() => setIsNoteOpen(!isNoteOpen)}>Notes</button>
        <button>Clues</button>
        <button>Files</button>
        <button onClick={() => (document.getElementById('case-report') as HTMLDialogElement)?.showModal()}>Case Report</button>
        <dialog className="nes-dialog" id="case-report">
          <form method="dialog">
            <h3>Case Report</h3>
            <p>Case Report: {data.name}'s Case File</p>
            <menu className="dialog-menu">
              <button>Close</button>
            </menu>
          </form>
        </dialog>
        <button><Link to="/desk">Desk</Link></button>
        <button onClick={() => (document.getElementById('settings') as HTMLDialogElement)?.showModal()}>Settings</button>
        <dialog className="nes-dialog" id="settings">
          <form method="dialog">
            <h3>Settings</h3>
            <p>Alert: this is a dialog.</p>
            <menu className="dialog-menu">
              <button>Nah</button>
              <button><Link to="/">Go Home</Link></button>
            </menu>
          </form>
        </dialog>
      </div>
      <div className={`interrogate-container ${isNoteOpen ? 'open' : ''}`}>
          <h2>The Title</h2>
        <div className='character-container'>
          <div className='mugshot'>
              <img src={data.mugshot}/>
          </div>
          <div className='stats'>
              <h3>{data.name}</h3>
              <h4>Age: {data.stats.Age}</h4>
              <h4>Occupation: {data.stats.Occupation}</h4>
              <h4>Known Associates: {data.stats["Known Associates"]}</h4>
          </div>
        </div>
        <div className='chatbot'>
          <form onSubmit={handleSendMessage} className="message-form">
            <h2>Messages</h2>
            <div>
              <div className='chat-history'>
                {data.stats.Chathistory.map((msg, index) => (
                  <div key={index} className='chat-message'>
                    <p className='player-message'><strong>You:</strong> {msg.question}</p>
                    <p className='bot-message'><strong>{data.name}:</strong> {msg.answer}</p>
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
            <button type='submit'>Submit</button>
          </form>
        </div>
      </div>
      {/*<div className={`notes ${isNoteOpen ? 'open' : ''}`}>

        <input type="text" placeholder="Add note here..."/>
      </div>*/}
    </div>
  );
}

export default Interrogate;