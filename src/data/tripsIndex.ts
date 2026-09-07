import type { Trip } from '../types/trip'
import { franceTrip } from './trips/france-2026'

// Registry of all trips. Adding a new trip is: create a file under
// src/data/trips/, then add it here. No other code needs to change.
export const trips: Trip[] = [franceTrip]

export const defaultTripId = franceTrip.meta.id

export function getTrip(id: string): Trip | undefined {
  return trips.find((t) => t.meta.id === id)
}
