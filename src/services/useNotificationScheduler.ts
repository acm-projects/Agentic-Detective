import { useEffect, useRef } from "react";
import { useNotificationStore } from "../store/useNotificationStore";

/*
  Drives the notification scheduler on every second of game time, and handles expiry cleanup.
  
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
  const elapsedMs = elapsed * 1000
 
  const lastTickRef = useRef(0)
 
  useEffect(() => {
    if (!active) return
    // Only tick once per second to avoid thrashing the store
    if (Math.floor(elapsed) === lastTickRef.current) return
    lastTickRef.current = Math.floor(elapsed)
 
    tick(elapsedMs, totalDuration)
    purgeExpired()
  }, [elapsed, active, tick, purgeExpired, elapsedMs, totalDuration])
}