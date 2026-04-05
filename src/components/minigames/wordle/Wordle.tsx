import { useState, useEffect, useCallback } from 'react'
import type { WordleData } from '../../../obj/notificationInterfaces'
import styles from '../MinigameModal.module.css'
import acceptedWords from './acceptedWords'

interface Props {
  data: WordleData
  onSuccess: () => void
  onFailure: () => void
}

type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd'

interface GuessRow {
  letters: string[]
  states: LetterState[]
  submitted: boolean
}

function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent')
  const answerArr = answer.split('')
  const guessArr = guess.split('')
  const used = Array(5).fill(false)

  // First pass: correct positions
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: present but wrong position
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = 'present'
        used[j] = true
        break
      }
    }
  }
  return result
}

function emptyRow(): GuessRow {
  return { letters: Array(5).fill(''), states: Array(5).fill('empty'), submitted: false }
}

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

const ACCEPTED_WORDS = new Set(
  [...acceptedWords.words, ...acceptedWords.valid].map((word: string) => word.trim().toUpperCase())
)

export function WordleMinigame({ data, onSuccess, onFailure }: Props) {
  const { answer, maxNumGuesses, hint } = data
  const normalizedAnswer = answer.toUpperCase()
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const [rows, setRows] = useState<GuessRow[]>(() => Array(maxNumGuesses).fill(null).map(emptyRow))
  const [currentRow, setCurrentRow] = useState(0)
  const [currentCol, setCurrentCol] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [shake, setShake] = useState(false)

  // Key letter -> best state seen so far
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({})

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const submitGuess = useCallback(() => {
    if (currentCol < 5) { triggerShake(); return }
    const guess = rows[currentRow].letters.join('')
    if (guess.length < 5) { triggerShake(); return }
    if (guess !== normalizedAnswer && !ACCEPTED_WORDS.has(guess)) { triggerShake(); return }

    const states = evaluateGuess(guess, normalizedAnswer)
    const newRows = rows.map((r, i) =>
      i === currentRow ? { ...r, states, submitted: true } : r
    )
    setRows(newRows)

    // Update keyboard
    setKeyStates(prev => {
      const next = { ...prev }
      const priority: Record<LetterState, number> = { correct: 3, present: 2, absent: 1, empty: 0, tbd: 0 }
      guess.split('').forEach((l, i) => {
        const cur = next[l]
        if (!cur || priority[states[i]] > priority[cur]) {
          next[l] = states[i]
        }
      })
      return next
    })

    const isWin = states.every(s => s === 'correct')
    if (isWin) {
      setWon(true)
      setGameOver(true)
      setTimeout(onSuccess, 1200)
      return
    }

    const nextRow = currentRow + 1
    if (nextRow >= maxNumGuesses) {
      setGameOver(true)
      setTimeout(onFailure, 1200)
      return
    }
    setCurrentRow(nextRow)
    setCurrentCol(0)
  }, [currentCol, currentRow, rows, normalizedAnswer, maxNumGuesses, onSuccess, onFailure])

  const handleKey = useCallback((key: string) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 100);

    if (gameOver) return
    if (key === 'ENTER') { submitGuess(); return }
    if (key === '⌫' || key === 'BACKSPACE') {
      if (currentCol === 0) return
      setRows(prev => {
        const next = prev.map((r, i) => i === currentRow ? { ...r, letters: [...r.letters] } : r)
        next[currentRow].letters[currentCol - 1] = ''
        return next
      })
      setCurrentCol(c => Math.max(0, c - 1))
      return
    }
    if (/^[A-Z]$/.test(key) && currentCol < 5) {
      setRows(prev => {
        const next = prev.map((r, i) => i === currentRow ? { ...r, letters: [...r.letters] } : r)
        next[currentRow].letters[currentCol] = key
        return next
      })
      setCurrentCol(c => Math.min(5, c + 1))
    }
  }, [gameOver, currentCol, currentRow, submitGuess])

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key.toUpperCase())
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleKey])

  return (
    <div className={styles.minigameInner}>
      <p className={styles.hint}>{hint}</p>

      {/* Grid */}
      <div className={styles.wordleGrid}>
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={`${styles.wordleRow} ${ri === currentRow && shake ? styles.wordleShake : ''}`}
          >
            {row.letters.map((letter, ci) => {
              const state = row.submitted ? row.states[ci] : (letter ? 'tbd' : 'empty')
              return (
                <div
                  key={ci}
                  className={`${styles.wordleTile} ${styles[`wordle_${state}`]}`}
                  style={{ animationDelay: row.submitted ? `${ci * 80}ms` : '0ms' }}
                >
                  {letter}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className={styles.wordleKeyboard}>
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className={styles.wordleKeyRow}>
            {row.map(key => {
              const state = keyStates[key]
              return (
                <button
                  key={key}
                  className={`${styles.wordleKey} ${ pressedKey === key ? styles.wordleKeyActive : '' } 
                  ${ state ? styles[`wordle_${state}`] : ''} ${key.length > 1 ? styles.wordleKeyWide : ''}`}
                  onClick={() => handleKey(key)}
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {gameOver && !won && (
        <p className={styles.errorMsg}>The word was <strong>{answer}</strong>. Evidence lost.</p>
      )}
      {won && <p className={styles.successMsg}>Decoded ✓</p>}
    </div>
  )
}