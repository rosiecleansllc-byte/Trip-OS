import { createTrip } from '../../lib/createTrip'
import type { Transport } from '../../types/trip'

// No booking codes, ticket numbers, email contents, or private documents are bundled.
// Flight times come from the updated October 29 airline receipt; all times are local.
export const peruTrip = createTrip({ name: 'Peru 2026', destination: 'Lima, Peru',
  startDate: '2026-11-05', endDate: '2026-11-16', timeZone: 'America/Lima', currency: 'PEN', travelers: 'Cecilia, Blake' }, 'peru-2026')

peruTrip.meta.budgetNote = 'Flights updated from the October 29 receipt. Lodging, activities, and ground transfers still need to be added.'
const flights: Transport[] = [
  { id: 'peru-cm891', mode: 'flight', from: 'Atlanta (ATL)', to: 'Panama City (PTY)', date: '2026-11-05', departTime: '16:20', arriveTime: '20:31', carrier: 'Copa Airlines', number: 'CM891', status: 'confirmed' },
  { id: 'peru-cm263', mode: 'flight', from: 'Panama City (PTY)', to: 'Lima (LIM)', date: '2026-11-05', departTime: '21:44', arriveTime: '01:20', carrier: 'Copa Airlines', number: 'CM263', status: 'confirmed', tip: 'Arrives November 6 at 1:20 AM. Updated flight replaces CM337. Scheduled Panama connection: 1 hour 13 minutes.' },
  { id: 'peru-cm264', mode: 'flight', from: 'Lima (LIM)', to: 'Panama City (PTY)', date: '2026-11-16', departTime: '02:35', arriveTime: '06:17', carrier: 'Copa Airlines', number: 'CM264', status: 'confirmed' },
  { id: 'peru-cm880', mode: 'flight', from: 'Panama City (PTY)', to: 'Atlanta (ATL)', date: '2026-11-16', departTime: '10:00', arriveTime: '14:17', carrier: 'Copa Airlines', number: 'CM880', status: 'confirmed' },
]
peruTrip.transport = flights.map(f => ({ ...f, privateDocumentKey: 'peru-2026-flights', privateDocumentType: 'confirmation' }))
peruTrip.days[0].title = 'Atlanta → Panama → Lima'
peruTrip.days[0].scheduleItems = flights.slice(0, 2).map(f => ({ id: `${f.id}-departure`, time: f.departTime, label: `${f.number}: ${f.from} → ${f.to}`, type: 'transport', tip: f.tip, privateDocumentKey: 'peru-2026-flights', privateDocumentType: 'confirmation' }))
peruTrip.days[1].title = 'Arrive in Lima'
peruTrip.days[1].scheduleItems = [{ id: 'peru-arrival', time: '01:20', label: 'CM263 arrives in Lima', type: 'transport', tip: 'Arrival is early Friday, November 6. Add your airport transfer and lodging details.' }]
peruTrip.days.at(-1)!.title = 'Lima → Panama → Atlanta'
peruTrip.days.at(-1)!.scheduleItems = flights.slice(2).map(f => ({ id: `${f.id}-departure`, time: f.departTime, label: `${f.number}: ${f.from} → ${f.to}`, type: 'transport', privateDocumentKey: 'peru-2026-flights', privateDocumentType: 'confirmation' }))
peruTrip.openItems = [
  { id: 'peru-lodging', tripId: 'peru-2026', label: 'Add lodging and check-in details', category: 'lodging', priority: 'high', status: 'open', detail: 'Include the early November 6 arrival when arranging access to your stay.' },
  { id: 'peru-transfers', tripId: 'peru-2026', label: 'Add airport and local transfers', category: 'transport', status: 'open' },
  { id: 'peru-plans', tripId: 'peru-2026', label: 'Add daily plans and reservations', category: 'other', status: 'open' },
]
// Keep the existing confirmation item's ID so its saved check still applies.
peruTrip.checklist = peruTrip.checklist!.filter(item => item.id !== 'chk-res-flight')
peruTrip.checklist.push({ id: 'peru-flight-doc', category: 'Reservations', label: 'Save updated flight confirmation', linkedDocumentKey: 'peru-2026-flights' })
