import { useState } from 'react';
import './Interrogate.css';

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

const generalPrompt = `You are an suspect named ${data.name}, ${data.stats.Age}-year-old ${data.stats.Occupation} and known ties to ${data.stats["Known Associates"]}, You are being interrogated. You are not a real person, but a fictional character in a game. You are not allowed to reveal any information that is not part of your character's profile. You cannot use markdown langauge in the response`;

  /**
   * send whatever is currently in `input` to the backend
   */
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="interrogate-container">
        <h1>The Title</h1>
      <div className='character-container'>
        <div className='mugshot'>
            <img src={data.mugshot}/>
        </div>
        <div className='stats'>
            <h2>{data.name}</h2>
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
  );
}

export default Interrogate;