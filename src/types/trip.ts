// Core data model for Trip OS.
// Nothing in this file is France-specific — every trip, present or future,
// is described by these shapes. Adding a new trip means adding a new file
// under src/data/trips and registering it in src/data/tripsIndex.ts.

export type ISODate = string // YYYY-MM-DD
export type ISODateTime = string // YYYY-MM-DDTHH:mm

export type BookingStatus =
  | 'confirmed'
  | 'paid'
  | 'pending'
  | 'optional'
  | 'cancelled'

export type BookingCategory =
  | 'hotel'
  | 'dining'
  | 'ticket'
  | 'activity'
  | 'other'

export type TransportMode = 'flight' | 'train' | 'local' | 'car'

export interface Money {
  amount: number
  currency: string // ISO 4217, e.g. "EUR"
}

export interface Traveler {
  id: string
  name: string
}

export interface Leg {
  id: string
  name: string // e.g. "Paris", "Mont-Saint-Michel", "Riviera"
  order: number
}

export interface Deadline {
  id: string
  label: string
  datetime: ISODateTime
  done?: boolean
}

// External actions a booking, transport leg, or schedule item can expose as
// one-tap buttons.
//
// websiteUrl / ticketUrl / reservationUrl / menuUrl / phone are PUBLIC —
// they point at a venue's official site, general info/purchase page, or
// contact info, safe to show anyone. They always render, in Share mode too.
//
// privateTicketUrl, modifyUrl, and the privateDocument* fields are PRIVATE
// and must NEVER render in Share mode — see components/ui/ActionRow.tsx,
// which enforces this centrally so no page can accidentally leak one:
//   - modifyUrl carries a personal manage/cancel token for the booking.
//   - privateTicketUrl is the traveler's own purchased ticket: the actual
//     e-ticket/PDF/QR-code link from the confirmation email. NEVER put a
//     personal ticket link in `ticketUrl` — that field is the public
//     info/purchase page (e.g. the museum's ticketing site), not the
//     traveler's redeemable ticket. Use `ticketUrl` for "where anyone
//     buys a ticket" and `privateTicketUrl` for "this trip's actual
//     ticket" — the two are rendered differently by ActionRow (see below)
//     specifically so the private one can never leak into Share mode.
//   - privateDocumentKey / privateDocumentLabel / privateDocumentType are a
//     photo or PDF of the traveler's own reservation confirmation, order
//     receipt, or QR-code ticket. This app has no backend and no login (by
//     design), so there is no server that could authenticate a request for
//     a "private" file — anything placed under public/ or bundled into the
//     JS is downloadable by anyone with the deployed URL, Share mode or
//     not. So these documents are NEVER shipped as static assets or seed
//     data at all. Instead `privateDocumentKey` names a slot (see
//     lib/privateDocs.ts) that each traveler fills in on their own device:
//     ActionRow shows an "Add {label}" button that reads a local file
//     (image or PDF) straight into IndexedDB, and a "View {label}" button
//     once one is stored — the file itself never leaves the browser, is
//     never in git, and is never part of the deployed site. The same key
//     used on a Booking, Transport, and matching ScheduleItem shares one
//     stored document across Bookings/Transport/Today. privateDocumentType
//     picks the button label when privateDocumentLabel is omitted ("View
//     ticket" / "View reservation" / "View confirmation" / "View receipt").
//     NEVER add a field here that points at a hosted file for a personal
//     document — if real authenticated hosting is ever added, it needs its
//     own reviewed field, not a repurposing of this one.
//
// ActionRow's Ticket button: outside Share mode it prefers
// privateTicketUrl (opens the traveler's actual ticket) and falls back to
// ticketUrl. In Share mode it only ever considers ticketUrl — if a
// privateTicketUrl exists but no public ticketUrl, the Ticket button is
// hidden entirely in Share mode rather than falling back to the private
// link. The private-document button follows the same rule as modifyUrl:
// rendered only outside Share mode, with no public fallback.
export interface LinkActions {
  websiteUrl?: string
  ticketUrl?: string // public — the info/purchase page anyone can use
  reservationUrl?: string
  menuUrl?: string
  phone?: string
  privateTicketUrl?: string // private — this traveler's actual e-ticket/PDF/QR
  modifyUrl?: string // private — manage/cancel link
  privateDocumentKey?: string // private — slot name for a device-local ticket/reservation/confirmation image or PDF (see lib/privateDocs.ts); never a hosted URL
  privateDocumentLabel?: string // button text override, e.g. "View ticket" — defaults from privateDocumentType
  privateDocumentType?: 'ticket' | 'reservation' | 'confirmation' | 'receipt'
}

// A public, shareable reference resource (an official transit map, a
// visa-requirements page, an embassy contact page, …) — safe to show
// anyone, Share mode included, unlike the traveler's own private
// documents above. isPrivate exists only so a resource can be excluded
// from Share mode without being deleted; omit it (or set false) for the
// normal, fully-public case.
export interface TravelResource {
  id: string
  title: string
  description?: string
  resourceUrl: string
  category: string
  isPrivate?: boolean
}

export interface ScheduleItem extends LinkActions {
  id: string
  time?: string // HH:mm, omit for all-day items
  label: string
  type: 'activity' | 'meal' | 'transport' | 'free' | 'lodging'
  location?: string
  notes?: string
  isPrivate?: boolean
  tip?: string // survives Share mode
}

export interface DayPlan {
  id: string
  date: ISODate
  dayNumber: number
  legId: string
  title: string
  outfitNote: string
  scheduleItems: ScheduleItem[]
  deadlines?: Deadline[]
  outfitBoardId?: string
  weatherNote?: string
}

export type OpenItemCategory = 'lodging' | 'transport' | 'packing' | 'documents' | 'other'
export type OpenItemPriority = 'high' | 'normal'

// A genuinely unresolved piece of trip planning — "we haven't decided/booked
// this yet" — as opposed to a Booking/Transport row, which represents
// something already confirmed. Keeping these as real, typed, filterable
// data (instead of prose buried in a note) is what lets Today's readiness
// dashboard and Bookings' "Still open" list both compute from the same
// source. priority controls both display order and how much an item
// counts against readiness (see lib/readiness.ts) — 'high' for things that
// block the trip from actually working (missing lodging, an undecided
// travel leg), 'normal' for lower-stakes prep (packing, optional bookings).
export interface OpenItem {
  id: string
  tripId: string
  label: string
  category: OpenItemCategory
  priority?: OpenItemPriority // defaults to 'normal'
  status: 'open' | 'done'
  detail?: string
  dueDate?: ISODate
  relatedDayId?: string // ties it to a DayPlan.id, so Today can surface it on that day
  relatedBookingId?: string // ties it to a Booking.id or Transport.id
  // A transport OpenItem that represents a full there-and-back leg rather
  // than a single direction — see lib/manualItems.ts openItemIsCoveredBy.
  // A single one-way manual transport entry never counts as resolving one
  // of these; two entries whose from/to are exact reverses of each other
  // are required.
  requiresRoundTrip?: boolean
}

// One line in a packing checklist. Deliberately separate from the France
// capsule-wardrobe/outfit-board system (CapsuleItem/OutfitBoard below,
// which is a styled visual wardrobe planner) — a trip can have either,
// both, or neither. Pack renders whichever the trip's data provides.
export interface PackingItem {
  id: string
  category: string // freeform section heading, e.g. "Clothing", "Tech"
  label: string
}

export interface Booking extends LinkActions {
  id: string
  category: BookingCategory
  name: string
  legId?: string
  dateStart: ISODate
  dateEnd?: ISODate
  time?: string
  status: BookingStatus
  cost?: Money | null
  isPointsBooking?: boolean
  confirmationCode?: string
  address?: string // directions target
  notes?: string // private — stripped in Share mode
  tip?: string // public — survives Share mode
  cancellationDeadline?: ISODateTime
}

export interface Transport extends LinkActions {
  id: string
  mode: TransportMode
  from: string
  to: string
  date: ISODate
  departTime?: string
  arriveTime?: string
  carrier?: string
  number?: string
  confirmationCode?: string
  cost?: Money | null
  status: BookingStatus
  notes?: string
  tip?: string
  location?: string // directions target, e.g. the departure station
}

export type CapsuleCategory =
  | 'outerwear'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'shoes'
  | 'accessory'

export interface CapsuleItem {
  id: string
  category: CapsuleCategory
  name: string
  note?: string
  imageUrl?: string
}

export interface OutfitBoard {
  id: string
  dayId: string
  itemNames: string[]
  note: string
  imageUrl?: string
}

export interface TripMeta {
  id: string
  name: string
  destinationLabel: string
  startDate: ISODate
  endDate: ISODate
  travelers: Traveler[]
  homeCurrency: string
  tripCurrency: string
  status: 'upcoming' | 'active' | 'past'
  coverImageUrl?: string
  weatherDisclaimer?: string
  budgetNote?: string
  outfitBoardImageUrl?: string // full capsule + daily-outfit board, for the Pack lightbox
}

// A trip item Cecilia adds herself from inside the app — a stay, a leg of
// transport, a restaurant reservation, an activity, or a free-form note —
// as opposed to everything above, which only ever comes from a trip's
// seed data file. Manual items are stored client-side (see useAppStore)
// and, at render time, get converted into the same Booking/Transport/
// ScheduleItem shapes as seeded data (see lib/manualItems.ts) so every
// page — Bookings, Transport, Trip, Today, Wallet — displays them exactly
// like a normal entry, Share-mode redaction included, with no per-page
// special-casing. One field set covers every type; a given type only
// ever populates the fields its form collects.
export type ManualItemType = 'stay' | 'transport' | 'restaurant' | 'activity' | 'other'
export type ManualItemStatus = 'planned' | 'confirmed' | 'paid'
export type ManualTransportMode = 'car' | 'rental-car' | 'rideshare' | 'train' | 'bus' | 'flight' | 'other'

export interface ManualTripItem {
  id: string
  tripId: string
  type: ManualItemType
  title: string // stay/restaurant/activity/other name; unused for transport, which derives its label from fromLocation/toLocation
  date: ISODate
  endDate?: ISODate // stay checkout date
  time?: string // check-in / reservation / start / departure time
  endTime?: string // activity end time / transport arrival time
  location?: string // activity venue name
  address?: string // directions target
  phone?: string
  websiteUrl?: string
  reservationUrl?: string
  notes?: string
  status: ManualItemStatus
  cost?: number
  currency?: string
  confirmationCode?: string // private — stripped in Share mode
  privateDocumentKey?: string
  privateDocumentType?: LinkActions['privateDocumentType']
  // transport-only
  transportMode?: ManualTransportMode
  carrier?: string
  fromLocation?: string
  toLocation?: string
  // restaurant party size, or activity ticket quantity — same "how many
  // people/tickets" field, labeled per type in the form
  partySize?: number
  // set once the traveler confirms this item resolves a specific OpenItem
  // (e.g. adding a Sep 11-13 stay resolves "Book lodging for Sep 11-13") —
  // see lib/manualItems.ts findResolvableOpenItems, which matches on
  // OpenItem.category + date coverage rather than on any hardcoded label.
  relatedOpenItemId?: string
  createdAt: string // ISO timestamp
}

export interface Trip {
  meta: TripMeta
  legs: Leg[]
  days: DayPlan[]
  bookings: Booking[]
  transport: Transport[]
  capsule: CapsuleItem[]
  outfitBoards: OutfitBoard[]
  openItems: OpenItem[]
  packingList?: PackingItem[] // a plain checklist, for trips without a styled capsule wardrobe
  resources?: TravelResource[] // public reference links, e.g. an official transit map
}
