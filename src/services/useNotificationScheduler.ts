import { useEffect, useRef } from "react";
import { useNotificationStore } from "../store/useNotificationStore";
import { useGameStore } from "../useGameStore";

/*
  Drives the notification scheduler on every conversation message, and handles expiry cleanup.
  
  Parameters:
  - elapsed          Seconds elapsed in the game (from your game timer store)
  - totalDuration    Total game duration in ms (default 600_000 = 10 min)
  - active           Pass false to pause scheduling (e.g. game over screen)
 */

export function useNotificationScheduler(
  elapsed: number,
  totalDuration = 600_000,
  active = true
) {
  const tick = useNotificationStore(s => s.tick)
  const purgeExpired = useNotificationStore(s => s.purgeExpired)
  const totalConversationCount = useGameStore(s => s.totalConversationCount)
  const elapsedMs = elapsed * 1000
  
  const lastElapsedSecondRef = useRef(-1)
  const lastMessageCountRef = useRef(-1)
 
  useEffect(() => {
    if (!active) return

    const elapsedSecond = Math.floor(elapsed)
    const elapsedChanged = elapsedSecond !== lastElapsedSecondRef.current
    const messageCountChanged = totalConversationCount !== lastMessageCountRef.current

    // Run when either game time advances or the conversation count changes.
    if (!elapsedChanged && !messageCountChanged) return

    lastElapsedSecondRef.current = elapsedSecond
    lastMessageCountRef.current = totalConversationCount
 
    tick(elapsedMs, totalDuration, totalConversationCount)
    purgeExpired()
  }, [elapsed, active, tick, purgeExpired, elapsedMs, totalDuration, totalConversationCount])
}