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
  }
}

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
    const merged = [...day.scheduleItems, ...extra].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
    return { ...day, scheduleItems: merged }
  })

  const openItems = trip.openItems.map((oi) =>
    resolvedOpenItemIds[`${trip.meta.id}:${oi.id}`] ? { ...oi, status: 'done' as const } : oi
  )

  return {
    ...trip,
    bookings: [...trip.bookings, ...manualBookings],
    transport: [...trip.transport, ...manualTransport],
    days,
    openItems,
  }
}

// Which currently-open OpenItems a manual stay/transport item plausibly
// resolves — matched generically by OpenItem.category and date coverage,
// never by label text, so this works for any trip without hardcoding.
// Callers show these as "Mark resolved" suggestions; nothing here
// auto-resolves anything.
export function findResolvableOpenItems(trip: Trip, item: ManualTripItem): OpenItem[] {
  const category = item.type === 'stay' ? 'lodging' : item.type === 'transport' ? 'transport' : null
  if (!category) return []
  const start = item.date
  const end = item.endDate ?? item.date
  return trip.openItems.filter((oi) => {
    if (oi.status !== 'open' || oi.category !== category) return false
    if (!oi.relatedDayId) return true
    const day = trip.days.find((d) => d.id === oi.relatedDayId)
    if (!day) return true
    return day.date >= start && day.date <= end
  })
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
  const type = openItem.category === 'lodging' ? 'stay' : openItem.category === 'transport' ? 'transport' : null
  if (!type) return []
  const day = openItem.relatedDayId ? trip.days.find((d) => d.id === openItem.relatedDayId) : undefined
  return manualItems.filter((i) => {
    if (i.tripId !== trip.meta.id || i.type !== type) return false
    if (!day) return true
    const start = i.date
    const end = i.endDate ?? i.date
    return day.date >= start && day.date <= end
  })
}
