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

// Cecilia's approved November 5–16 lookbook. The illustrations are public
// outfit flat lays; personal try-on photos are never bundled with the app.
const dailyOutfits = [
  {
    label: 'Travel to Lima',
    note: 'White tee + denim jeans + black zip layer + white knit sneakers.',
    items: ['White tee', 'Denim jeans', 'Black zip layer', 'White knit sneakers'],
  },
  {
    label: 'Barranco',
    note: 'Pink skirt + pale-blue button-down tied at the waist + multicolor flat sandals. Alternative top: multicolor striped blouse.',
    items: ['Pink skirt', 'Pale-blue button-down', 'Multicolor flat sandals', 'Striped blouse'],
  },
  {
    label: 'Day and dinner out',
    note: 'Day: neon coral shift dress + multicolor flat sandals. Evening: white textured tie-strap top + silver sequin midi skirt + silver ankle-strap pumps.',
    items: ['Neon coral shift dress', 'Multicolor flat sandals', 'White tie-strap top', 'Silver sequin midi skirt', 'Silver ankle-strap pumps'],
  },
  {
    label: 'Birthday and Osaka',
    note: 'Birthday day, November 8: white lace dress or mustard chevron midi + multicolor flat sandals. Evening at Osaka: emerald tonal-paisley midi + silver ankle-strap pumps. Optional layer: cream cropped cardigan with three-quarter sleeves or neon-yellow scarf.',
    items: ['White lace dress', 'Mustard chevron midi', 'Multicolor flat sandals', 'Emerald paisley midi', 'Silver ankle-strap pumps', 'Cream cropped cardigan', 'Neon-yellow scarf'],
  },
  {
    label: 'Paracas',
    note: 'White tee + black Girlfriend Collective yoga pants + black zip layer + white knit lace-up sneakers.',
    items: ['White tee', 'Black yoga pants', 'Black zip layer', 'White knit sneakers'],
  },
  {
    label: 'Paragliding and Quipas',
    note: 'Paragliding: white tee + black Girlfriend Collective yoga pants + white knit lace-up sneakers; bring the black zip layer. Evening: pale-blue tied button-down + black wide-leg trousers + red flats.',
    items: ['White tee', 'Black yoga pants', 'White knit sneakers', 'Black zip layer', 'Pale-blue button-down', 'Black wide-leg trousers', 'Red flats'],
  },
  {
    label: 'Casual Lima',
    note: 'Ivory sleeveless embroidered blouse with scalloped eyelet trim + orange-pink printed drawstring shorts + multicolor flat sandals.',
    items: ['Ivory embroidered blouse', 'Orange-pink printed shorts', 'Multicolor flat sandals'],
  },
  {
    label: 'Day and Amador',
    note: 'Day: neon-yellow shoulder-cutout shift dress + multicolor flat sandals. Evening for La Carreta / Amador: navy silk slip midi + silver ankle-strap pumps. Optional layer: cream cropped cardigan with three-quarter sleeves or neon-yellow scarf.',
    items: ['Neon-yellow shift dress', 'Multicolor flat sandals', 'Navy silk slip midi', 'Silver ankle-strap pumps', 'Cream cropped cardigan', 'Neon-yellow scarf'],
  },
  {
    label: 'Day and Carnaval',
    note: 'Day: sleeveless botanical-print ruffled blouse + denim jeans + multicolor flat sandals. Evening at Carnaval: peach floral satin midi + silver ankle-strap pumps.',
    items: ['Sleeveless botanical blouse', 'Denim jeans', 'Multicolor flat sandals', 'Peach floral satin midi', 'Silver ankle-strap pumps'],
  },
  {
    label: 'Lima lunch',
    note: 'White lace-inset dress + chunky translucent necklace + multicolor flat sandals. Optional layer: cream cropped cardigan with three-quarter sleeves; red flats for an evening shoe swap.',
    items: ['White lace dress', 'Translucent necklace', 'Multicolor flat sandals', 'Cream cropped cardigan', 'Red flats'],
  },
  {
    label: 'Relaxed Lima',
    note: 'Mustard chevron midi dress + multicolor flat sandals + optional cream cropped cardigan with three-quarter sleeves. The neon-yellow scarf is another dress layer.',
    items: ['Mustard chevron midi', 'Multicolor flat sandals', 'Cream cropped cardigan', 'Neon-yellow scarf'],
  },
  {
    label: 'Flight home',
    note: 'White tee + denim jeans + black zip layer + white knit sneakers.',
    items: ['White tee', 'Denim jeans', 'Black zip layer', 'White knit sneakers'],
  },
]

const itemFlats: Record<string, string> = {
  "White tee": "white-travel-tee",
  "Denim jeans": "denim-jeans",
  "Black zip layer": "black-zip-layer",
  "White knit sneakers": "white-knit-sneakers",
  "Pink skirt": "pink-skirt",
  "Pale-blue button-down": "blue-tied-button-down",
  "Multicolor flat sandals": "multicolor-flat-sandals",
  "Striped blouse": "striped-blouse",
  "Neon coral shift dress": "coral-neon-dress",
  "White tie-strap top": "white-tie-strap-top",
  "Silver sequin midi skirt": "silver-sequin-skirt",
  "Silver ankle-strap pumps": "silver-ankle-strap-pumps",
  "White lace dress": "white-lace-dress",
  "Mustard chevron midi": "mustard-chevron-dress",
  "Emerald paisley midi": "emerald-paisley-dress",
  "Cream cropped cardigan": "cream-cropped-cardigan",
  "Neon-yellow scarf": "neon-yellow-scarf",
  "Black yoga pants": "black-yoga-pants",
  "Black wide-leg trousers": "black-wide-leg-trousers",
  "Red flats": "red-ballet-flats",
  "Ivory embroidered blouse": "embroidered-sleeveless-top",
  "Orange-pink printed shorts": "printed-shorts",
  "Neon-yellow shift dress": "neon-yellow-dress",
  "Navy silk slip midi": "navy-silk-slip-dress",
  "Sleeveless botanical blouse": "botanical-blouse",
  "Peach floral satin midi": "peach-floral-satin-dress"
}

peruTrip.outfitBoards = peruTrip.days.map((day, index) => {
  const outfit = dailyOutfits[index]
  const id = `${day.id}-outfit`
  day.outfitNote = outfit.note
  day.outfitBoardId = id
  return {
    id,
    dayId: day.id,
    label: outfit.label,
    note: outfit.note,
    itemNames: outfit.items,
    itemImageUrls: Object.fromEntries(outfit.items.filter(name => itemFlats[name]).map(name => [name, `/images/outfits/peru-2026/items/${itemFlats[name]}.webp`])),
    imageUrl: `/images/outfits/peru-2026/nov-${day.date.slice(-2)}.webp`,
  }
})
