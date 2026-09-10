import type { DayPlan, EventSession, Trip } from '../types/trip'

// Helpers for the reusable "parent event + traveler-selected personal
// session schedule" model (see types/trip.ts EventSession) — generic
// across any trip/event, never hardcoded to a specific summit or
// conference.

/** All EventSessions tied to a given parent ScheduleItem, in chronological order. */
export function getSessionsForItem(trip: Trip, parentItemId: string): EventSession[] {
  return (trip.eventSessions ?? [])
    .filter((s) => s.parentItemId === parentItemId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Every EventSession whose parent event falls on this day, in chronological order. */
export function getSessionsForDay(trip: Trip, day: DayPlan): EventSession[] {
  const parentIds = new Set(day.scheduleItems.map((item) => item.id))
  return (trip.eventSessions ?? [])
    .filter((s) => parentIds.has(s.parentItemId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function sessionMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Which selected session is "next" right now, and which comes after it —
// same next/after shape as lib/date.ts findNextScheduleItem, but keyed
// off a session's own start/end range instead of a single `time` +
// sortOrder. A session already underway (started but not yet ended)
// still counts as "next" so Today never skips past it mid-session.
export function findNextEventSession(
  sessions: EventSession[],
  now: Date
): { next?: EventSession; after?: EventSession } {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const index = sessions.findIndex((s) => sessionMinutes(s.endTime) > nowMinutes)
  if (index === -1) return {}
  return { next: sessions[index], after: sessions[index + 1] }
}
