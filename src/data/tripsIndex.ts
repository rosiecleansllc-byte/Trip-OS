import type { Trip } from '../types/trip'
import { franceTrip } from './trips/france-2026'
import { austinTrip } from './trips/austin-2026'

// Registry of all trips. Adding a new trip is: create a file under
// src/data/trips/, then add it here. No other code needs to change.
export const trips: Trip[] = [austinTrip, franceTrip]

// Whichever trip starts soonest is the default — currently Austin, since
// it departs before France. Recomputes automatically as trips are added
// or a trip's dates change, rather than hardcoding which one is "next".
export const defaultTripId = [...trips].sort((a, b) => a.meta.startDate.localeCompare(b.meta.startDate))[0].meta.id

export function getTrip(id: string): Trip | undefined {
  return trips.find((t) => t.meta.id === id)
}
