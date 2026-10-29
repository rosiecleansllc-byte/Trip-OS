import { standardPackingChecklist } from './packingTemplate'
import type { Trip } from '../types/trip'

export interface NewTripInput {
  name: string
  destination: string
  startDate: string
  endDate: string
  timeZone: string
  currency: string
  travelers: string
}

export function createTrip(input: NewTripInput, id = `trip-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`): Trip {
  const { name, destination, startDate, endDate, timeZone } = input
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  if (!name.trim() || !destination.trim()) throw new Error('Enter a trip name and destination.')
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) throw new Error('Choose valid dates, with the end on or after the start.')
  const dayCount = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1
  if (dayCount > 366) throw new Error('Please keep each trip to 366 days or fewer.')
  try { new Intl.DateTimeFormat('en', { timeZone }).format() } catch { throw new Error('Enter a valid destination time zone, such as America/Lima.') }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Enter a three-letter currency code, such as PEN or USD.')
  return {
    meta: { id, name: name.trim(), destinationLabel: destination.trim(), startDate, endDate, timeZone,
      travelers: input.travelers.split(',').map(n => n.trim()).filter(Boolean).map((name, i) => ({ id: `${id}-traveler-${i}`, name })),
      homeCurrency: 'USD', tripCurrency: input.currency, status: 'upcoming' },
    legs: [{ id: `${id}-destination`, name: destination.trim(), order: 1, timeZone }],
    days: Array.from({ length: dayCount }, (_, i) => ({ id: `${id}-day-${i + 1}`, date: new Date(Date.parse(startDate) + i * 86400000).toISOString().slice(0, 10), dayNumber: i + 1,
      legId: `${id}-destination`, title: i === 0 ? 'Departure day' : i === dayCount - 1 ? 'Return day' : `Day ${i + 1}`, outfitNote: '', scheduleItems: [] })),
    bookings: [], transport: [], capsule: [], outfitBoards: [],
    openItems: [{ id: `${id}-planning`, tripId: id, label: 'Add your bookings and daily plans', category: 'other', status: 'open' }],
    checklist: standardPackingChecklist(),
  }
}
