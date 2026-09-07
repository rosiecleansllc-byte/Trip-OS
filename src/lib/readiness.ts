import type { Booking, OpenItem, Transport, Trip } from '../types/trip'
import { formatDateCompact } from './date'

// Trip readiness reflects whether the trip is actually planned — confirmed
// bookings/transport vs. genuinely unresolved OpenItems — never whether a
// confirmed document has been copied into this device's IndexedDB yet.
// That distinction matters: a flight can be fully "Ready" while its
// private-document button still says "Add confirmation", because the
// traveler already has the booking, she just hasn't loaded the file into
// *this* browser. Booking/Transport `status` is the source of truth for
// "confirmed"; privateDocumentKey/IndexedDB state never factors in here.

function isConfirmed(status: Booking['status']): boolean {
  return status === 'confirmed' || status === 'paid'
}

function readableBookingLine(b: Booking): string {
  if (b.category === 'hotel') {
    const range =
      b.dateEnd && b.dateEnd !== b.dateStart
        ? `${formatDateCompact(b.dateStart)} – ${formatDateCompact(b.dateEnd)}`
        : formatDateCompact(b.dateStart)
    return `${b.name} confirmed for ${range}`
  }
  if (b.category === 'ticket') return `${b.name} ticket confirmed`
  return `${b.name} confirmed`
}

// Pairs up an outbound/return leg with the same carrier and mode into one
// "Round-trip {carrier} flights confirmed" line; anything that doesn't
// pair up (one-way legs, local transit, different carriers) is listed
// individually. Purely structural — no trip-specific logic.
function readableTransportLines(transport: Transport[]): string[] {
  const confirmed = transport.filter((t) => isConfirmed(t.status))
  const lines: string[] = []
  const used = new Set<string>()

  for (const t of confirmed) {
    if (used.has(t.id)) continue
    const pair = confirmed.find(
      (o) => o.id !== t.id && !used.has(o.id) && o.carrier && o.carrier === t.carrier && o.mode === t.mode && o.from === t.to && o.to === t.from
    )
    if (pair && t.carrier) {
      const noun = t.mode === 'flight' ? 'flights' : 'legs'
      lines.push(`Round-trip ${t.carrier} ${noun} confirmed`)
      used.add(t.id)
      used.add(pair.id)
    } else {
      lines.push(`${t.carrier ? `${t.carrier} ` : ''}${t.from} → ${t.to} confirmed`)
      used.add(t.id)
    }
  }
  return lines
}

export interface Readiness {
  percent: number
  readyLines: string[]
  openItems: OpenItem[] // open (unresolved) items, high priority first
}

export function computeReadiness(trip: Trip): Readiness {
  const readyLines = [...readableTransportLines(trip.transport), ...trip.bookings.filter((b) => isConfirmed(b.status)).map(readableBookingLine)]

  const openItems = (trip.openItems ?? [])
    .filter((i) => i.status === 'open')
    .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

  // Simple, transparent weighting: every confirmed leg/booking is one
  // "ready" point; every open item counts against readiness, high-priority
  // ones (a missing flight, undecided ground transport) twice as much as
  // routine prep (packing) — so a couple of big unresolved gaps pull the
  // percentage down much further than one optional task left unchecked.
  const readyPoints = readyLines.length
  const neededWeight = openItems.reduce((sum, i) => sum + (i.priority === 'high' ? 2 : 1), 0)
  const total = readyPoints + neededWeight
  const percent = total === 0 ? 100 : Math.round((readyPoints / total) * 100)

  return { percent, readyLines, openItems }
}
