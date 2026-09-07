import type { Trip } from '../types/trip'
import { tripPhase } from '../lib/date'
import { franceTrip } from './trips/france-2026'
import { austinTrip } from './trips/austin-2026'

// Registry of all trips. Adding a new trip is: create a file under
// src/data/trips/, then add it here. No other code needs to change.
export const trips: Trip[] = [austinTrip, franceTrip]

// The trip to land on by default. Never hardcodes a specific trip id —
// it's recomputed from today's date against each trip's own start/end, so
// it keeps working as dates pass and trips are added:
//   1. a trip underway right now wins outright
//   2. otherwise, whichever upcoming trip starts soonest
//   3. otherwise (everything's in the past), whichever trip ended most
//      recently
export function pickDefaultTripId(allTrips: Trip[], now: Date = new Date()): string {
  const active = allTrips.find((t) => tripPhase(t.meta.startDate, t.meta.endDate, now) === 'active')
  if (active) return active.meta.id

  const upcoming = allTrips.filter((t) => tripPhase(t.meta.startDate, t.meta.endDate, now) === 'pre')
  if (upcoming.length > 0) {
    return [...upcoming].sort((a, b) => a.meta.startDate.localeCompare(b.meta.startDate))[0].meta.id
  }

  return [...allTrips].sort((a, b) => b.meta.endDate.localeCompare(a.meta.endDate))[0].meta.id
}

export const defaultTripId = pickDefaultTripId(trips)

export function getTrip(id: string): Trip | undefined {
  return trips.find((t) => t.meta.id === id)
}
