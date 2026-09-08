import { useEffect, useState } from 'react'

// A ticking "real" clock (Date.now(), the actual current instant) for
// components whose UI depends on time having passed — leave-soon alerts,
// snooze expiry, cancellation-deadline countdowns, the alert bell badge.
// Without this, `new Date()` read during render only ever reflects
// whatever the last *unrelated* re-render happened to catch, so a
// leave-soon alert could sit un-shown (or a snoozed alert un-reappear)
// indefinitely if nothing else causes the component to re-render.
//
// Ticks once a minute — alert generation here works at minute
// granularity (HH:mm schedule times, minute-rounded countdowns), so
// anything faster would just be wasted renders — plus immediately on
// `visibilitychange`/`focus`, so a tab the traveler switched back to (or
// unlocked their phone into) catches up right away instead of waiting
// out the rest of the current minute.
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])

  return now
}
