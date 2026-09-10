import type { DayPlan, LinkActions, Transport, TransportMode, Trip } from '../types/trip'
import { formatTime } from './date'

// A compact, reusable "rest of today's route" sequence — one row per real
// leg (any active flight/train/rental-car/local-transport Transport
// record dated today) plus, when today's own schedule includes one, a
// lodging arrival/checkout row. Deliberately NOT derived from a day's
// full scheduleItems narrative (which may spell a single flight out
// across several rows — "Travel to ATL" / the flight itself / "Arrive")
// — this is the condensed, one-row-per-leg version for a quick "what's
// left today" glance, never a duplicate of the full itinerary or a
// booking card. Nothing here is specific to any one trip: any trip
// with Transport records and/or a type:'lodging' ScheduleItem on a
// given day gets the same treatment for free.
export interface TravelSequenceStep extends LinkActions {
  id: string
  kind: 'transport' | 'lodging'
  label: string
  caption?: string // a time/time-range, or a relative fallback like "After landing"
  location?: string
}

function timeToMinutes(time?: string): number {
  if (!time) return Number.POSITIVE_INFINITY
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Local transport (a rideshare, taxi, shuttle) reads better
// destination-first ("Uber to Hyatt House Austin/Downtown"); a real
// point-to-point leg (flight/train/rental car) reads better as a route
// ("ATL → AUS").
function transportLabel(t: Transport): string {
  if (t.mode === 'local') return `${t.carrier ?? 'Ride'} to ${t.to}`
  return `${t.from} → ${t.to}`
}

function transportCaption(t: Transport): string | undefined {
  if (t.departTime && t.arriveTime) return `${formatTime(t.departTime)} – ${formatTime(t.arriveTime)}`
  if (t.departTime) return formatTime(t.departTime)
  return undefined
}

// A relative fallback caption for a transport step authored with no
// departTime of its own (e.g. a day-of rideshare with no set pickup
// time) — inferred from whichever mode came right before it, so the
// traveler still sees something actionable instead of a blank line.
function afterModeLabel(mode: TransportMode): string {
  return mode === 'flight' ? 'After landing' : 'After arrival'
}

// Explicit sequencing tier for a step, used to break ties between steps
// that share a sort key (most commonly: several untimed steps, all
// falling back to the same Infinity key below). Real times always win
// first (see the sort itself) — this only decides order among steps
// Trip OS has no clock time for, so it can't just be "whichever was
// declared first in the trip's data": 1. primary transport (a real
// point-to-point leg — flight/train/rental car) comes before 2. local
// ground transportation (a rideshare/taxi/shuttle) comes before 3.
// lodging arrival/checkout. Nothing here names a specific trip, city,
// or hotel — any trip's data sorts the same way.
function stepTier(kind: 'transport' | 'lodging', mode?: TransportMode): 1 | 2 | 3 {
  if (kind === 'lodging') return 3
  return mode === 'local' ? 2 : 1
}

function linkActionsOf(source: LinkActions): LinkActions {
  return {
    websiteUrl: source.websiteUrl,
    ticketUrl: source.ticketUrl,
    reservationUrl: source.reservationUrl,
    menuUrl: source.menuUrl,
    phone: source.phone,
    privateTicketUrl: source.privateTicketUrl,
    modifyUrl: source.modifyUrl,
    privateDocumentKey: source.privateDocumentKey,
    privateDocumentLabel: source.privateDocumentLabel,
    privateDocumentType: source.privateDocumentType,
  }
}

export function getTravelSequenceForDay(trip: Trip, day: DayPlan): TravelSequenceStep[] {
  interface Entry {
    key: number
    tier: 1 | 2 | 3
    mode?: TransportMode
    step: TravelSequenceStep
  }
  const entries: Entry[] = []

  for (const t of trip.transport) {
    if (t.date !== day.date || t.status === 'cancelled') continue
    entries.push({
      key: timeToMinutes(t.departTime),
      tier: stepTier('transport', t.mode),
      mode: t.mode,
      step: {
        id: t.id,
        kind: 'transport',
        label: transportLabel(t),
        caption: transportCaption(t),
        location: t.location,
        ...linkActionsOf(t),
      },
    })
  }

  for (const item of day.scheduleItems) {
    if (item.type !== 'lodging' || item.cancelled) continue
    entries.push({
      key: timeToMinutes(item.time),
      tier: stepTier('lodging'),
      step: {
        id: item.id,
        kind: 'lodging',
        label: item.label,
        caption: item.time ? formatTime(item.time) : undefined,
        location: item.location,
        ...linkActionsOf(item),
      },
    })
  }

  // Real times are authoritative and always sort first. Ties — most
  // commonly several untimed steps, all falling back to the same
  // Infinity key — break by stepTier (primary transport, then local
  // ground transport, then lodging), and only then by original
  // insertion order, so the sequence never depends on which order a
  // trip's data happened to declare same-tier steps in.
  const sorted = entries
    .map((e, index) => ({ ...e, index }))
    .sort((a, b) => a.key - b.key || a.tier - b.tier || a.index - b.index)

  return sorted.map((entry, i) => {
    const { step } = entry
    if (step.caption || step.kind !== 'transport') return step
    const prevMode = sorted[i - 1]?.mode
    if (!prevMode) return step
    return { ...step, caption: afterModeLabel(prevMode) }
  })
}
