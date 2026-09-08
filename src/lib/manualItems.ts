import type {
  Booking,
  BookingCategory,
  BookingStatus,
  ManualItemStatus,
  ManualItemType,
  ManualTransportMode,
  ManualTripItem,
  OpenItem,
  ScheduleItem,
  Transport,
  TransportMode,
  Trip,
} from '../types/trip'
import { scheduleSortValue } from './date'

// Converts a manually-created trip item into the same shapes seeded trip
// data uses (Booking, Transport, ScheduleItem), so every page renders a
// manual item exactly like a normal one — same cards, same Share-mode
// redaction (lib/share.ts), same private-document wallet (ActionRow +
// lib/privateDocs.ts). No page needs to know a "manual item" concept
// exists; getEffectiveTrip below is the only place that does.
//
// Every manual-derived Booking/Transport/ScheduleItem keeps the manual
// item's own id, which is always prefixed "manual-" (see
// createManualItem) — that prefix is how the UI tells a manual entry
// apart from seeded data to decide whether to show the •••
// edit/delete menu.

const MANUAL_PREFIX = 'manual-'

export function isManualId(id: string): boolean {
  return id.startsWith(MANUAL_PREFIX)
}

export function createManualItem(
  input: Omit<ManualTripItem, 'id' | 'createdAt' | 'privateDocumentKey' | 'privateDocumentType'>
): ManualTripItem {
  const id = `${MANUAL_PREFIX}${crypto.randomUUID()}`
  return {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    privateDocumentKey: `${id}-doc`,
    privateDocumentType: defaultPrivateDocumentType(input.type),
  }
}

function defaultPrivateDocumentType(type: ManualItemType): ManualTripItem['privateDocumentType'] {
  switch (type) {
    case 'stay':
    case 'transport':
      return 'confirmation'
    case 'restaurant':
      return 'reservation'
    case 'activity':
      return 'ticket'
    default:
      return undefined
  }
}

function statusToBookingStatus(status: ManualItemStatus): BookingStatus {
  if (status === 'planned') return 'pending'
  return status
}

function moneyFor(item: ManualTripItem): Booking['cost'] {
  if (item.cost == null) return null
  return { amount: item.cost, currency: item.currency ?? 'USD' }
}

const BOOKING_CATEGORY: Record<Exclude<ManualItemType, 'transport'>, BookingCategory> = {
  stay: 'hotel',
  restaurant: 'dining',
  activity: 'activity',
  other: 'other',
}

export function manualItemToBooking(item: ManualTripItem): Booking {
  return {
    id: item.id,
    category: BOOKING_CATEGORY[item.type as Exclude<ManualItemType, 'transport'>],
    name: item.title,
    dateStart: item.date,
    dateEnd: item.endDate,
    time: item.time,
    status: statusToBookingStatus(item.status),
    cost: moneyFor(item),
    confirmationCode: item.confirmationCode,
    address: item.address ?? item.location,
    notes: item.notes,
    websiteUrl: item.websiteUrl,
    reservationUrl: item.reservationUrl,
    phone: item.phone,
    privateDocumentKey: item.privateDocumentKey,
    privateDocumentType: item.privateDocumentType,
    travelMinutes: item.travelMinutes,
    arrivalBufferMinutes: item.arrivalBufferMinutes,
  }
}

const TRANSPORT_MODE: Record<ManualTransportMode, TransportMode> = {
  car: 'car',
  'rental-car': 'car',
  rideshare: 'local',
  bus: 'local',
  train: 'train',
  flight: 'flight',
  other: 'local',
}

const TRANSPORT_MODE_LABEL: Record<ManualTransportMode, string> = {
  car: 'Car',
  'rental-car': 'Rental car',
  rideshare: 'Rideshare',
  bus: 'Bus',
  train: 'Train',
  flight: 'Flight',
  other: 'Other',
}

export function manualItemToTransport(item: ManualTripItem): Transport {
  const mode = item.transportMode ?? 'other'
  return {
    id: item.id,
    mode: TRANSPORT_MODE[mode],
    from: item.fromLocation ?? '',
    to: item.toLocation ?? '',
    date: item.date,
    departTime: item.time,
    arriveTime: item.endTime,
    carrier: item.carrier ?? TRANSPORT_MODE_LABEL[mode],
    status: statusToBookingStatus(item.status),
    cost: moneyFor(item),
    confirmationCode: item.confirmationCode,
    notes: item.notes,
    websiteUrl: item.websiteUrl,
    location: item.fromLocation,
    privateDocumentKey: item.privateDocumentKey,
    privateDocumentType: item.privateDocumentType,
    travelMinutes: item.travelMinutes,
    arrivalBufferMinutes: item.arrivalBufferMinutes,
  }
}

const SCHEDULE_TYPE: Record<ManualItemType, ScheduleItem['type']> = {
  stay: 'lodging',
  transport: 'transport',
  restaurant: 'meal',
  activity: 'activity',
  other: 'free',
}

export function manualItemToScheduleItem(item: ManualTripItem): ScheduleItem {
  return {
    id: item.id,
    time: item.time,
    label: item.type === 'transport' ? `${item.fromLocation || '?'} → ${item.toLocation || '?'}` : item.title,
    type: SCHEDULE_TYPE[item.type],
    location: item.address ?? item.location ?? item.fromLocation,
    notes: item.notes,
    websiteUrl: item.websiteUrl,
    reservationUrl: item.reservationUrl,
    phone: item.phone,
    privateDocumentKey: item.privateDocumentKey,
    privateDocumentType: item.privateDocumentType,
    travelMinutes: item.travelMinutes,
    arrivalBufferMinutes: item.arrivalBufferMinutes,
  }
}

// A day's schedule mixes seeded context items (often untimed — "Pack /
// checkout", "Breakfast at Hyatt House") with real timed bookings, both
// seeded and manually-added. Sorting by `time` alone (untimed → always
// last) works fine for a day with no manual items, but once a manual
// item merges in, every untimed seeded item — even one that plainly
// belongs at the *start* of the day — gets pushed after every timed one.
// scheduleSortValue (lib/date.ts) lets seed data place an untimed item on
// the same minutes-since-midnight scale as a real time via `sortOrder`,
// without claiming a clock time it doesn't actually have.

// Merges a trip's own seeded data with the traveler's manually-added
// items and resolved-OpenItem overrides into one Trip-shaped object.
// Every page renders this instead of the raw imported trip, so manual
// items show up everywhere seeded ones do without any page-specific
// wiring. Never mutates the seeded trip.
export function getEffectiveTrip(
  trip: Trip,
  manualItems: ManualTripItem[],
  resolvedOpenItemIds: Record<string, boolean>
): Trip {
  const tripManualItems = manualItems.filter((i) => i.tripId === trip.meta.id)
  const manualBookings = tripManualItems.filter((i) => i.type !== 'transport').map(manualItemToBooking)
  const manualTransport = tripManualItems.filter((i) => i.type === 'transport').map(manualItemToTransport)

  const scheduleByDate = new Map<string, ScheduleItem[]>()
  for (const item of tripManualItems) {
    const list = scheduleByDate.get(item.date) ?? []
    list.push(manualItemToScheduleItem(item))
    scheduleByDate.set(item.date, list)
  }

  const days = trip.days.map((day) => {
    const extra = scheduleByDate.get(day.date)
    if (!extra || extra.length === 0) return day
    const merged = [...day.scheduleItems, ...extra]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => scheduleSortValue(a.item) - scheduleSortValue(b.item) || a.index - b.index)
      .map(({ item }) => item)
    return { ...day, scheduleItems: merged }
  })

  const openItems = trip.openItems.map((oi) => {
    const key = `${trip.meta.id}:${oi.id}`
    if (!(key in resolvedOpenItemIds)) return oi
    return { ...oi, status: resolvedOpenItemIds[key] ? ('done' as const) : ('open' as const) }
  })

  return {
    ...trip,
    bookings: [...trip.bookings, ...manualBookings],
    transport: [...trip.transport, ...manualTransport],
    days,
    openItems,
  }
}

// Whether a manual item plausibly resolves a given OpenItem — matched
// generically by OpenItem.category and date coverage, never by label
// text, so this works for any trip without hardcoding. This single
// predicate backs findResolvableOpenItems, findManualItemsForOpenItem,
// and the auto-unresolve check below, so "does X justify Y" is computed
// exactly one way everywhere.
export function manualItemQualifiesForOpenItem(trip: Trip, item: ManualTripItem, openItem: OpenItem): boolean {
  if (item.tripId !== trip.meta.id) return false
  const category = item.type === 'stay' ? 'lodging' : item.type === 'transport' ? 'transport' : null
  if (category !== openItem.category) return false
  if (!openItem.relatedDayId) return true
  const day = trip.days.find((d) => d.id === openItem.relatedDayId)
  if (!day) return true
  const start = item.date
  const end = item.endDate ?? item.date
  return day.date >= start && day.date <= end
}

// Whether any two of the given manual items form a real round trip — one
// leg's from/to is the exact reverse of another's. Same pairing rule
// lib/readiness.ts already uses to recognize a confirmed round-trip from
// Transport entries.
function hasRoundTripPair(items: ManualTripItem[]): boolean {
  return items.some((a) =>
    items.some(
      (b) =>
        b.id !== a.id &&
        a.fromLocation &&
        a.toLocation &&
        b.fromLocation === a.toLocation &&
        b.toLocation === a.fromLocation
    )
  )
}

// A single 'rental-car' item counts as its own round trip only when its
// own dates prove it — kept from `date` through a real, later `endDate`,
// i.e. picked up and dropped off on different days. That's genuine
// evidence the traveler had the car for an outbound-and-back stretch, not
// just a same-day booking. A rental with no endDate (or one equal to
// date) proves nothing about a return and is held to the same standard
// as any other one-way transport leg — it still needs a real
// reverse-direction pair via hasRoundTripPair.
function rentalCoversRoundTrip(item: ManualTripItem): boolean {
  return item.transportMode === 'rental-car' && !!item.endDate && item.endDate > item.date
}

// For most OpenItems, a single qualifying manual item is enough evidence
// to suggest resolving it. An OpenItem marked `requiresRoundTrip` (a
// transport OpenItem representing a full there-and-back leg, not just one
// direction) additionally needs either two qualifying manual transport
// items that form a round trip (see hasRoundTripPair), or a single
// multi-day 'rental-car' item (see rentalCoversRoundTrip) — a rental kept
// across a real date span inherently covers both directions, so it never
// needs a separate reverse-direction entry the way a one-way rideshare/
// train/flight leg would. Any other single one-way entry — including a
// one-day rental with no proven return — never counts as covering it on
// its own.
function openItemIsCoveredBy(trip: Trip, tripManualItems: ManualTripItem[], openItem: OpenItem): boolean {
  const qualifying = tripManualItems.filter((i) => manualItemQualifiesForOpenItem(trip, i, openItem))
  if (qualifying.length === 0) return false
  if (!openItem.requiresRoundTrip) return true
  return hasRoundTripPair(qualifying) || qualifying.some(rentalCoversRoundTrip)
}

// Which currently-open OpenItems a manual stay/transport item plausibly
// resolves, given the full current set of the trip's manual items (needed
// so a round-trip OpenItem can see both legs, not just the one just
// saved/edited). Callers show these as "Mark resolved" suggestions;
// nothing here auto-resolves anything.
export function findResolvableOpenItems(trip: Trip, manualItems: ManualTripItem[], item: ManualTripItem): OpenItem[] {
  const tripManualItems = manualItems.filter((i) => i.tripId === trip.meta.id)
  return trip.openItems.filter(
    (oi) =>
      oi.status === 'open' &&
      manualItemQualifiesForOpenItem(trip, item, oi) &&
      openItemIsCoveredBy(trip, tripManualItems, oi)
  )
}

// The reverse lookup — given one open OpenItem, which of the traveler's
// manual items (if any) look like they'd resolve it. Used to render a
// "Mark resolved" affordance on the OpenItem itself (e.g. in Bookings'
// "Still open" list) rather than only right after saving a new item.
export function findManualItemsForOpenItem(
  trip: Trip,
  manualItems: ManualTripItem[],
  openItem: OpenItem
): ManualTripItem[] {
  return manualItems.filter((i) => manualItemQualifiesForOpenItem(trip, i, openItem))
}

// After a manual item is deleted or edited, some previously-resolved
// OpenItems may no longer be justified. An OpenItem stays resolved only
// as long as at least one manual item both (a) explicitly claims credit
// for it via relatedOpenItemId — set when the traveler taps "Mark
// resolved" or checks its checklist box — and (b) still qualifies under
// the same category+date-range check used to offer that button in the
// first place. A `requiresRoundTrip` OpenItem additionally needs its
// linked items to still form a round trip (see hasRoundTripPair) — losing
// just one of two linked legs breaks the round trip even though the other
// leg is still individually linked and qualifying. Returns the ids of
// OpenItems that should flip back to open, given the manual items list
// *after* the delete/edit already applied. Never infers a relationship
// after the fact from label text or any other heuristic.
export function findOpenItemsToUnresolve(
  trip: Trip,
  manualItems: ManualTripItem[],
  resolvedOpenItemIds: Record<string, boolean>
): string[] {
  const tripManualItems = manualItems.filter((i) => i.tripId === trip.meta.id)
  return trip.openItems
    .filter((oi) => resolvedOpenItemIds[`${trip.meta.id}:${oi.id}`])
    .filter((oi) => {
      const linkedAndQualifying = tripManualItems.filter(
        (i) => i.relatedOpenItemId === oi.id && manualItemQualifiesForOpenItem(trip, i, oi)
      )
      if (!oi.requiresRoundTrip) return linkedAndQualifying.length === 0
      // Same rental-car exception as openItemIsCoveredBy above — editing
      // a rental's dates down to a single day (or deleting its endDate)
      // reopens the OpenItem exactly like deleting one leg of a pair.
      const stillRoundTrip = hasRoundTripPair(linkedAndQualifying) || linkedAndQualifying.some(rentalCoversRoundTrip)
      return !stillRoundTrip
    })
    .map((oi) => oi.id)
}
