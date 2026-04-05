import { useMemo, useState } from 'react';
import type { CaesarCipherData } from '../../../obj/notificationInterfaces';
import './CipherMinigame.css';

function caesarEncode(text: string, shift: number): string {
  return text
    .toUpperCase()
    .split('')
    .map((char) => {
      if (char < 'A' || char > 'Z') return char;
      return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
    })
    .join('');
}

interface Props {
  data: CaesarCipherData;
  onSuccess: () => void;
  onFailure: () => void;
}

export function CipherMinigame({ data, onSuccess, onFailure }: Props) {
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isWrong, setIsWrong] = useState(false);

  const encoded = useMemo(() => {
    return caesarEncode(data.plain, data.shift);
  }, [data.plain, data.shift]);

  const handleSubmit = () => {
    const normalizedGuess = guess.trim().toUpperCase();
    const normalizedAnswer = data.plain.trim().toUpperCase();

    if (!normalizedGuess) {
      setFeedback('TYPE AN ANSWER FIRST.');
      return;
    }

    if (normalizedGuess === normalizedAnswer) {
      setFeedback('MESSAGE DECIPHERED.');
      onSuccess();
      return;
    }

    setFeedback('INCORRECT. TRY AGAIN.');
    setIsWrong(true);
    onFailure();

    setTimeout(() => {
      setIsWrong(false);
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="cipher-wrapper">
      <div className="cipher-paper">
        <div className="cipher-top-strip">DAILY CRIMELETTER PUZZLE</div>

        <h3 className="cipher-title">Decipher the Message</h3>

        <div className="cipher-subtitle-row">
          <span className="cipher-subtle">Vol. 1889</span>
          <span className="cipher-subtitle">Confidential Telegram Recovery</span>
          <span className="cipher-subtle">2¢</span>
        </div>

        <div className={`cipher-message-box ${isWrong ? 'cipher-shake' : ''}`}>
          <div className="cipher-message-label">Encoded Message</div>
          <div className="cipher-message">{encoded}</div>
        </div>

        <div className="cipher-content">
          <div className="cipher-clues-box">
            <div className="cipher-section-heading">Clues</div>
            <ul className="cipher-clue-list">
              {data.clues.map((clue, index) => (
                <li key={index}>{clue}</li>
              ))}
            </ul>
          </div>

          <div className="cipher-answer-box">
            <div className="cipher-section-heading">Your Answer</div>

            <input
              className="cipher-input"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="TYPE YOUR ANSWER"
              autoComplete="off"
              spellCheck={false}
            />

            <button className="cipher-button" onClick={handleSubmit}>
              Decipher
            </button>

            <div className={`cipher-feedback ${feedback ? 'show' : ''}`}>
              {feedback || ' '}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}