import type { ChecklistItem, Trip } from '../types/trip'
import { tripPhase } from './date'

// France's complete preparation checklist, with destination-specific tasks
// generalized. Stable IDs + trip-scoped packed/override keys isolate progress.
const template: ChecklistItem[] = [

    // Clothing
    { id: 'chk-clothing-outfits', category: 'Clothing', label: 'Outfits / capsule finalized' },
    { id: 'chk-clothing-sleepwear', category: 'Clothing', label: 'Sleepwear' },
    { id: 'chk-clothing-underwear', category: 'Clothing', label: 'Underwear' },
    { id: 'chk-clothing-walking-shoes', category: 'Clothing', label: 'Walking shoes' },
    { id: 'chk-clothing-dress-shoes', category: 'Clothing', label: 'Dressier shoes' },
    { id: 'chk-clothing-rain-shell', category: 'Clothing', label: 'White rain shell' },
    { id: 'chk-clothing-scarf-accessories', category: 'Clothing', label: 'Scarf / accessories' },

    // Personal
    { id: 'chk-personal-toiletries', category: 'Personal', label: 'Toiletries' },
    { id: 'chk-personal-medications', category: 'Personal', label: 'Medications' },
    { id: 'chk-personal-makeup-skincare', category: 'Personal', label: 'Makeup / skincare' },
    { id: 'chk-personal-prescription-info', category: 'Personal', label: 'Prescription information if needed', optional: true },

    // Tech
    { id: 'chk-tech-phone-charger', category: 'Tech', label: 'Phone charger' },
    { id: 'chk-tech-portable-battery', category: 'Tech', label: 'Portable battery' },
    { id: 'chk-tech-power-adapter', category: 'Tech', label: 'Destination-compatible power adapter' },
    { id: 'chk-tech-laptop', category: 'Tech', label: 'Laptop' },
    { id: 'chk-tech-laptop-charger', category: 'Tech', label: 'Laptop charger' },
    { id: 'chk-tech-earbuds', category: 'Tech', label: 'Earbuds' },
    { id: 'chk-tech-offline-destination-map', category: 'Tech', label: 'Download offline destination map' },
    { id: 'chk-tech-offline-other-maps', category: 'Tech', label: 'Download offline maps for other stops (if needed)', optional: true },
    { id: 'chk-tech-cellular-plan', category: 'Tech', label: 'Confirm international cellular/data plan' },

    // Travel
    { id: 'chk-travel-passport', category: 'Travel', label: 'Passport' },
    { id: 'chk-travel-wallet', category: 'Travel', label: 'Wallet' },
    { id: 'chk-travel-flight-confirmations', category: 'Travel', label: 'Flight confirmations' },
    { id: 'chk-travel-hotel-confirmations', category: 'Travel', label: 'Hotel confirmations' },
    { id: 'chk-travel-attraction-confirmations', category: 'Travel', label: 'Attraction/ticket confirmations' },
    { id: 'chk-travel-backup-payment', category: 'Travel', label: 'Backup payment method' },
    { id: 'chk-travel-arrival-cash', category: 'Travel', label: 'Local currency / arrival cash plan' },

    // Transportation
    { id: 'chk-transport-departure-airport', category: 'Transportation', label: 'Departure-airport transportation' },
    { id: 'chk-transport-arrival-transfer', category: 'Transportation', label: 'Arrival airport → lodging transportation' },
    { id: 'chk-transport-intercity', category: 'Transportation', label: 'Intercity transportation (if needed)', optional: true },
    { id: 'chk-transport-local', category: 'Transportation', label: 'Local transportation plan' },
    { id: 'chk-transport-return-intercity', category: 'Transportation', label: 'Return intercity transportation (if needed)', optional: true },
    { id: 'chk-transport-departure-transfer', category: 'Transportation', label: 'Lodging → departure airport transportation' },

    // Reservations: actual document links are attached for each trip below.
    { id: 'chk-res-flight', category: 'Reservations', label: 'Save flight confirmations' },
    { id: 'chk-res-lodging', category: 'Reservations', label: 'Save lodging confirmations' },
    { id: 'chk-res-activities', category: 'Reservations', label: 'Save activity/ticket confirmations', optional: true },

    // Before You Go
    { id: 'chk-before-checkin', category: 'Before You Go', label: 'Airline check-in' },
    { id: 'chk-before-charge-phone', category: 'Before You Go', label: 'Charge phone' },
    { id: 'chk-before-charge-battery', category: 'Before You Go', label: 'Charge portable battery' },
    { id: 'chk-before-download-entertainment', category: 'Before You Go', label: 'Download flight entertainment/books', optional: true },
    { id: 'chk-before-luggage-weight', category: 'Before You Go', label: 'Check luggage weight/airline limits' },
    { id: 'chk-before-secure-home', category: 'Before You Go', label: 'Secure home', homeTask: true },
    { id: 'chk-before-trash', category: 'Before You Go', label: 'Handle trash/perishables', homeTask: true },
    { id: 'chk-before-mail', category: 'Before You Go', label: 'Mail/package plan', homeTask: true },
]

export function standardPackingChecklist(): ChecklistItem[] {
  return template.map(item => ({ ...item }))
}

// Adds missing defaults at read time so trips already saved on a device get
// the full checklist too. Never writes over a trip, its overrides or checks.
// Completed trips retain their historical checklist exactly as it was.
export function withStandardPackingChecklist(trip: Trip, now = new Date()): Trip {
  if (tripPhase(trip.meta.startDate, trip.meta.endDate, now) === 'post') return trip
  const existing = trip.checklist ?? []
  const ids = new Set(existing.map(item => item.id))
  const labels = new Set(existing.map(item => item.label.toLowerCase().trim()))
  const docs = new Set(existing.map(item => item.linkedDocumentKey).filter(Boolean))
  const reservationDocs: Record<string, string | undefined> = {
    'chk-res-flight': trip.transport.find(item => item.mode === 'flight')?.privateDocumentKey,
    'chk-res-lodging': trip.bookings.find(item => item.category === 'hotel')?.privateDocumentKey,
    'chk-res-activities': trip.bookings.find(item => item.category === 'ticket' || item.category === 'activity')?.privateDocumentKey,
  }
  const additions = standardPackingChecklist().flatMap(item => {
    if (ids.has(item.id) || labels.has(item.label.toLowerCase().trim())) return []
    const linkedDocumentKey = reservationDocs[item.id]
    if (linkedDocumentKey && docs.has(linkedDocumentKey)) return []
    return [{ ...item, ...(linkedDocumentKey ? { linkedDocumentKey } : {}) }]
  })
  return { ...trip, checklist: [...existing, ...additions] }
}
