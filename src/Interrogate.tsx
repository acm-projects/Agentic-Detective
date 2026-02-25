import { useState } from 'react';
import './Interrogate.css';

const data = {
    mugshot: "https://ih1.redbubble.net/image.5653390764.7646/raf,360x360,075,t,fafafa:ca443f4786.u1.jpg",
    name: "Cheif Keef",
    stats: {
        "Age": 35,
        "Occupation": "Rapper",
        "Known Associates": "Lil Durk, Young Chop",
        "Crimes": "Armed Robbery, Drug Trafficking",
        "Chathistory": []
    }
}

function Interrogate() {
  
  // store the current text the user is typing
  const [input, setInput] = useState('');
  const [characterResponse, updateResponse] = useState('');

  /**
   * send whatever is currently in `input` to the backend
   */
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    console.log("Submitting question:", input);

    try {
      const response = await fetch("http://localhost:3000/response", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input }),
      });

      const data = await response.json();
      updateResponse(data.response);
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
            {Object.entries(data.stats).map(([key, value]) => (
                <div key={key}><h4>{key}:{value}</h4></div>
            ))}
        </div>
      </div>
      <div className='chatbot'>
        <h2>Messages</h2>
        <form onSubmit={handleSendMessage} className="message-form">
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
      <div>
        <p>Character Response: </p>
        <p>{characterResponse}</p>
      </div>
    </div>
  );
}

export default Interrogate;