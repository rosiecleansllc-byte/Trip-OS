import type { Trip } from '../types/trip'

// Centralizes every timezone lookup/conversion in the app. Nothing
// outside this file should read Trip/Leg timezone fields directly or
// construct a "current time" for trip logic any other way — see
// nowInZone below for why that matters.

// Used only when a trip provides no timeZone at all (shouldn't happen
// for real trip data, but keeps every caller safe rather than throwing)
// — the device's own zone, which is only "correct" by coincidence when
// the destination and the device happen to match.
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

// Resolves the IANA zone a given leg (or the trip generally, if legId is
// omitted) should use: the leg's own override first, then the trip's
// default, then the device's zone as a last resort. Never assumes the
// device's current timezone equals the destination's — that assumption
// is exactly what produces a wrong "today"/"next up" when a traveler
// opens a France trip while still physically in the US.
export function getTripTimeZone(trip: Trip, legId?: string): string {
  if (legId) {
    const leg = trip.legs.find((l) => l.id === legId)
    if (leg?.timeZone) return leg.timeZone
  }
  return trip.meta.timeZone ?? deviceTimeZone()
}

// Returns a Date whose local getters (getFullYear/getMonth/getDate/
// getHours/getMinutes/getSeconds) equal the current wall-clock time in
// `timeZone` — deliberately NOT a Date that "is" that moment in UTC.
// Every existing date helper in lib/date.ts (findCurrentDay,
// isSameISODate, daysUntil, findNextScheduleItem, ...) already takes an
// optional `now: Date` and reads it through those same local getters, so
// passing this in as that argument makes all of them timezone-correct
// with no change to their own logic, signatures, or the rest of their
// call sites (which keep defaulting to `new Date()`, i.e. the device's
// own zone, where that's actually what's wanted).
export function nowInZone(timeZone: string, reference: Date = new Date()): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(reference)
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    // hour12:false can format midnight as "24" in some engines — fold
    // back to 0 so the constructed Date lands on the right calendar day.
    const hour = get('hour') % 24
    return new Date(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  } catch {
    return reference
  }
}

// The inverse of nowInZone: given a naive local date-time string (no
// offset, e.g. a Booking.cancellationDeadline like "2026-09-29T16:00")
// that's meant to be read as wall-clock time IN `timeZone`, returns the
// actual absolute instant (a real Date, safe to compare via getTime()
// against Date.now() or another real timestamp) that wall-clock time
// corresponds to. Without this, `new Date(localIso)` parses the string
// in the *device's* current zone — so a Paris cancellation deadline
// authored as "16:00" would silently mean 4pm Chicago time on a device
// physically in the US, hours off from the real Paris deadline.
//
// Single-pass DST-unaware correction (guess the offset from one sample,
// then apply it) — accurate everywhere except the rare case where the
// deadline instant itself falls inside a DST transition, which is an
// acceptable tradeoff for a cancellation deadline (unlike nowInZone,
// this never runs against "right now", so there's no ticking clock to
// visibly glitch across the transition).
export function zonedTimeToUtc(localIso: string, timeZone: string): Date {
  const [datePart, timePart = '00:00:00'] = localIso.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h = 0, mi = 0, s = 0] = timePart.split(':').map(Number)
  // Guess: treat the wall-clock fields as if they were already UTC.
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  // Read what that guessed instant actually looks like in `timeZone`.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(guess))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const seenAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  // The gap between what we intended (guess) and what `timeZone` reads
  // at that instant (seenAsUtc) is exactly that zone's UTC offset.
  return new Date(guess - (seenAsUtc - guess))
}

// A short zone label ("CDT", "CET") for display, e.g. next to a leave-by
// time so it's unambiguous which clock it's in when the traveler is
// reading it from a different timezone than the trip's own.
export function formatTimeZoneAbbrev(timeZone: string, reference: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(reference)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}
