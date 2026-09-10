import { useEffect, useState } from 'react'
import type { Booking, BookingCategory, ISODate, LinkActions, ScheduleItem, Transport, TransportMode, Trip } from '../types/trip'
import { listPrivateDocKeys } from './privateDocs'

// Aggregates every document-bearing item across a trip into one flat,
// deduplicated list — the data behind the Wallet's Today/Upcoming/All
// Documents sections and Today's compact "Today's documents" card.
//
// Call this with getEffectiveTrip's result, never the raw seeded trip —
// getEffectiveTrip already folds manual items into bookings/transport/
// scheduleItems with the exact same shapes (see lib/manualItems.ts), so
// a manually-added booking's document shows up here for free, with no
// separate manual-item pass needed.
//
// Seeded data often gives the *same* privateDocumentKey to a Booking (or
// Transport) row and the ScheduleItem that represents it on a given day
// — e.g. a flight confirmation is both a Transport leg and a "Frontier
// ATL → AUS" schedule item. Deduping by key, checked in Booking >
// Transport > ScheduleItem order, keeps exactly one Wallet entry per
// physical document while preferring whichever source carries the
// richest metadata (a Booking/Transport's cost/status/category over a
// bare schedule line).

export type WalletCategory = 'flight' | 'transport' | 'hotel' | 'dining' | 'tickets' | 'other'

export const WALLET_CATEGORY_LABEL: Record<WalletCategory, string> = {
  flight: 'Flights',
  transport: 'Transport',
  hotel: 'Hotels',
  dining: 'Dining',
  tickets: 'Tickets / Activities',
  other: 'Other',
}

export const WALLET_CATEGORY_ORDER: WalletCategory[] = ['flight', 'transport', 'hotel', 'dining', 'tickets', 'other']

export interface WalletDocEntry {
  id: string // = privateDocumentKey, unique per entry
  privateDocumentKey: string
  privateDocumentType?: LinkActions['privateDocumentType']
  privateDocumentLabel?: string
  title: string
  date: ISODate
  time?: string
  category: WalletCategory
  legName?: string
  // True when the source Booking/Transport was cancelled — the document
  // itself is still kept fully browsable here (never deleted), but a
  // cancelled item's document should never be treated as "still needed"
  // by alerts.ts's missing-document check. A ScheduleItem-only entry
  // (no matching Booking/Transport row) is never cancelled on its own.
  cancelled: boolean
}

const BOOKING_CATEGORY_TO_WALLET: Record<BookingCategory, WalletCategory> = {
  hotel: 'hotel',
  dining: 'dining',
  ticket: 'tickets',
  activity: 'tickets',
  other: 'other',
}

const TRANSPORT_MODE_TO_WALLET: Record<TransportMode, WalletCategory> = {
  flight: 'flight',
  train: 'transport',
  local: 'transport',
  car: 'transport',
}

const SCHEDULE_TYPE_TO_WALLET: Record<ScheduleItem['type'], WalletCategory> = {
  activity: 'tickets',
  meal: 'dining',
  transport: 'transport',
  free: 'other',
  lodging: 'hotel',
}

function legNameForDate(trip: Trip, date: ISODate): string | undefined {
  const day = trip.days.find((d) => d.date === date)
  if (!day) return undefined
  return trip.legs.find((l) => l.id === day.legId)?.name
}

function fromBooking(trip: Trip, b: Booking): WalletDocEntry {
  return {
    id: b.privateDocumentKey!,
    privateDocumentKey: b.privateDocumentKey!,
    privateDocumentType: b.privateDocumentType,
    privateDocumentLabel: b.privateDocumentLabel,
    title: b.name,
    date: b.dateStart,
    time: b.time,
    category: BOOKING_CATEGORY_TO_WALLET[b.category],
    legName: b.legId ? trip.legs.find((l) => l.id === b.legId)?.name : legNameForDate(trip, b.dateStart),
    cancelled: b.status === 'cancelled',
  }
}

function fromTransport(trip: Trip, t: Transport): WalletDocEntry {
  return {
    id: t.privateDocumentKey!,
    privateDocumentKey: t.privateDocumentKey!,
    privateDocumentType: t.privateDocumentType,
    privateDocumentLabel: t.privateDocumentLabel,
    title: `${t.from} → ${t.to}`,
    date: t.date,
    time: t.departTime,
    category: TRANSPORT_MODE_TO_WALLET[t.mode],
    legName: legNameForDate(trip, t.date),
    cancelled: t.status === 'cancelled',
  }
}

function fromScheduleItem(date: ISODate, legName: string | undefined, item: ScheduleItem): WalletDocEntry {
  return {
    id: item.privateDocumentKey!,
    privateDocumentKey: item.privateDocumentKey!,
    privateDocumentType: item.privateDocumentType,
    privateDocumentLabel: item.privateDocumentLabel,
    title: item.label,
    date,
    time: item.time,
    category: SCHEDULE_TYPE_TO_WALLET[item.type],
    legName,
    cancelled: Boolean(item.cancelled),
  }
}

export function buildWalletDocEntries(trip: Trip): WalletDocEntry[] {
  const seen = new Set<string>()
  const entries: WalletDocEntry[] = []

  for (const b of trip.bookings) {
    if (!b.privateDocumentKey || seen.has(b.privateDocumentKey)) continue
    seen.add(b.privateDocumentKey)
    entries.push(fromBooking(trip, b))
  }
  for (const t of trip.transport) {
    if (!t.privateDocumentKey || seen.has(t.privateDocumentKey)) continue
    seen.add(t.privateDocumentKey)
    entries.push(fromTransport(trip, t))
  }
  for (const day of trip.days) {
    const legName = trip.legs.find((l) => l.id === day.legId)?.name
    for (const item of day.scheduleItems) {
      if (!item.privateDocumentKey || seen.has(item.privateDocumentKey)) continue
      seen.add(item.privateDocumentKey)
      entries.push(fromScheduleItem(day.date, legName, item))
    }
  }

  return entries
}

export function sortWalletEntries(entries: WalletDocEntry[]): WalletDocEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
  })
}

// One IndexedDB read (listPrivateDocKeys) covers every row in the
// Wallet, instead of each card independently checking its own key —
// this only tells the Wallet's grouping/badge logic which entries have
// a file saved yet; each WalletDocCard still owns its own read/write
// for View/Replace/Delete, same as PrivateDocumentAction elsewhere.
export function usePrivateDocKeySet(): { keys: Set<string>; refresh: () => void } {
  const [result, setResult] = useState<{ token: number; keys: Set<string> } | undefined>(undefined)
  const [token, setToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    listPrivateDocKeys()
      .then((ks) => {
        if (!cancelled) setResult({ token, keys: new Set(ks) })
      })
      .catch(() => {
        if (!cancelled) setResult({ token, keys: new Set() })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const current = result && result.token === token ? result : undefined
  return { keys: current?.keys ?? new Set(), refresh: () => setToken((t) => t + 1) }
}
