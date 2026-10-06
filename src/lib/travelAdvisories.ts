import type { Transport } from '../types/trip'

export interface TravelAdvisory {
  id: string
  title: string
  detail: string
}

// Route-specific operational guidance that Trip OS can surface from
// itinerary data. Keep this as a small, evidence-backed ruleset rather
// than burying destination quirks in page components or one trip's prose.
//
// Côte d'Azur TER / iPhone gate note:
// - SNCF says mobile e-tickets are valid at boarding gates and recommends
//   holding the phone still roughly 10 cm from the reader; increasing
//   display contrast can help. If a valid ticket still will not open the
//   gate, travelers should ask station staff for help.
// - Multiple traveler reports specifically describe iPhone/Apple Wallet
//   scanning trouble at Nice-Ville, including Wallet/payment UI opening
//   instead of the gate reading the ticket. A 2026 report says the same
//   Nice gate rejected the Apple Wallet version while the SNCF app QR
//   worked.
//
// Because the failure is not universal and SNCF still officially supports
// mobile tickets, the advisory does not claim phones "do not work." It
// gives a resilient fallback: station ticket where convenient, otherwise
// keep the original SNCF Connect/PDF QR ready rather than relying on
// Apple Wallet alone.
const RIVIERA_TER_TERMS = [
  'nice',
  'monaco',
  'monte-carlo',
  'villefranche',
  'menton',
  'eze',
  'èze',
  'beaulieu',
  'cap-d’ail',
  "cap-d'ail",
  'cannes',
  'antibes',
]

function normalizedRoute(t: Transport): string {
  return [t.from, t.to, t.location, t.carrier].filter(Boolean).join(' ').toLocaleLowerCase()
}

function isRivieraTer(t: Transport): boolean {
  if ((t.carrier ?? '').toLocaleLowerCase() !== 'ter') return false
  const route = normalizedRoute(t)
  return RIVIERA_TER_TERMS.some((term) => route.includes(term))
}

export function getTravelAdvisoriesForTransport(t: Transport): TravelAdvisory[] {
  if (!isRivieraTer(t)) return []

  return [
    {
      id: 'riviera-ter-iphone-gates',
      title: 'Riviera TER ticket tip for iPhone users',
      detail:
        'Nice-area TER gates can be finicky with iPhone/Apple Wallet QR codes. Easiest option: buy at the station machine/counter. If you use a mobile ticket, keep the original QR in SNCF Connect or a downloaded PDF/screenshot ready, raise screen brightness/contrast, hold it still about 10 cm from the reader, and use the gate intercom or ask staff if it still will not scan.',
    },
  ]
}
