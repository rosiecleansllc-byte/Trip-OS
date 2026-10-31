import type { EffectiveChecklistItem } from './checklist'
import type { Booking, OpenItem, Transport, Trip } from '../types/trip'
import { formatDateCompact } from './date'

// Readiness combines confirmed plans, unresolved tasks and the required packing
// checklist. Full readiness also requires explicit departure confirmation.

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

export function computeReadiness(trip: Trip, checklist: EffectiveChecklistItem[] = []): Readiness {
  const readyLines = [...readableTransportLines(trip.transport), ...trip.bookings.filter((b) => isConfirmed(b.status)).map(readableBookingLine)]

  const openItems = (trip.openItems ?? [])
    .filter((i) => i.status === 'open')
    .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

  // Planning is the bulk of preparation; a long packing list must not
  // outweigh confirmed flights and lodging just because it has more rows.
  const required = checklist.filter(item => !item.optional)
  const preparation = required.filter(item => item.id !== 'chk-departed-home')
  const incomplete = required.filter(item => !item.checked).length
  const departed = required.some(item => item.id === 'chk-departed-home' && item.checked)
  const neededWeight = openItems.reduce((sum, item) => sum + (item.priority === 'high' ? 2 : 1), 0)
  const planningTotal = readyLines.length + neededWeight
  const planning = planningTotal ? readyLines.length / planningTotal : 0
  const packing = preparation.length ? preparation.filter(item => item.checked).length / preparation.length : 0
  const score = Math.round(80 * planning + 15 * packing + (departed ? 5 : 0))
  const percent = departed && incomplete === 0 && neededWeight === 0 ? 100 : Math.min(99, score)

  return { percent, readyLines, openItems }
}
