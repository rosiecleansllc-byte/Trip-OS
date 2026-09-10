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
  // IANA zone name (e.g. "America/Chicago", "Europe/Paris") for this leg
  // specifically — only needed when a single trip actually crosses real
  // timezones (e.g. a future US-to-Europe itinerary). Falls back to
  // TripMeta.timeZone when unset; see lib/timezone.ts getTripTimeZone,
  // the one place that resolves this generically.
  timeZone?: string
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

// Optional generic scheduling fields for computing a "leave by" time —
// see lib/leaveBy.ts, the single place that turns these (plus an item's
// own event time) into a displayed leave-by. Deliberately generic rather
// than a hard-coded per-category travel-time table: a restaurant
// reservation might carry `{ travelMinutes: 20, arrivalBufferMinutes: 10
// }`, an airport departure `{ travelMinutes: 35, arrivalBufferMinutes:
// 120 }`. Omit both (the common case) rather than guessing — leave-by is
// only ever shown when real data backs it.
export interface TravelTiming {
  travelMinutes?: number
  arrivalBufferMinutes?: number
}

export interface ScheduleItem extends LinkActions, TravelTiming {
  id: string
  time?: string // HH:mm, omit for all-day items
  // Position hint for an untimed item, on the same 0–1439 "minutes since
  // midnight" scale as a parsed `time` — lets a day mix seeded context
  // items (breakfast, pack/checkout) with real timed bookings without
  // every untimed item collapsing to the end of the day once a manual
  // item merges in. Only consulted when `time` is absent; an item with
  // neither still sorts after everything else, in its original order —
  // see getEffectiveTrip's day merge in lib/manualItems.ts.
  sortOrder?: number
  label: string
  type: 'activity' | 'meal' | 'transport' | 'free' | 'lodging'
  location?: string
  notes?: string
  isPrivate?: boolean
  tip?: string // survives Share mode
  // Display-only: this line represents a plan that fell through (e.g. a
  // canceled flight) but is being kept visible rather than deleted, per
  // Trip OS's "never silently delete a record of what was booked" rule.
  // Distinct from Booking/Transport's own `status` — a ScheduleItem is
  // just a day's narrative text, so this is the one lightweight flag it
  // needs to render a muted "Canceled" treatment and drop out of "Next
  // up" consideration (see lib/date.ts callers filtering on this).
  cancelled?: boolean
  // Heading for this item's EventSession children (see EventSession
  // below), e.g. "My Summit Schedule" — only meaningful when at least
  // one EventSession's parentItemId points at this item. Left unset,
  // EventSessionSchedule falls back to a generic "My Schedule".
  personalScheduleLabel?: string
}

// One session within a larger, multi-track event (a conference, summit,
// or festival with a full public agenda) that the traveler has
// personally chosen to attend. Trip OS never tries to model the full
// public agenda — only the sessions actually selected, tied to the
// ScheduleItem that represents the parent event via `parentItemId`
// (see ScheduleItem.personalScheduleLabel above) rather than embedding
// the whole itinerary into one notes field. This keeps "parent event +
// traveler-selected personal session schedule" reusable for any future
// conference/summit/festival with the same shape — see
// lib/eventSessions.ts for the helpers that read this generically.
export interface EventSession {
  id: string
  parentItemId: string // ScheduleItem.id of the parent event this session belongs to
  startTime: string // HH:mm, 24-hour
  endTime: string // HH:mm, 24-hour
  title: string
  room: string // room/stage/track label
  speaker?: string
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
  // When a day has more than one look (e.g. a travel-day outfit plus a
  // separate one for an activity later that day), set this instead of
  // outfitBoardId — see lib/outfits.ts getOutfitBoardsForDay, the one
  // place that resolves either form generically. outfitBoardId alone
  // still works unchanged for every single-look day (e.g. every France
  // day), so no existing trip needs to change.
  outfitBoardIds?: string[]
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
  // are required — except a single 'rental-car' entry whose own dates
  // (date -> a later endDate) prove it was kept across a real multi-day
  // span, which inherently covers both directions on its own (see
  // rentalCoversRoundTrip). A one-day or dateless rental doesn't qualify.
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

export interface Booking extends LinkActions, TravelTiming {
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

export interface Transport extends LinkActions, TravelTiming {
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

// A single wardrobe piece — the atomic unit outfits are built from (see
// Outfit below). "CapsuleItem"/"CapsuleCategory" are the wardrobe-item
// types; kept under their original name since every seed file and
// existing component (Pack's capsule tab, CapsuleItemImage) already
// uses them — "wardrobe" is the vocabulary the UI presents, this is the
// data underneath it.
export type CapsuleCategory =
  | 'outerwear'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'shoes'
  | 'bag'
  | 'accessory'
  | 'other'

export interface CapsuleItem {
  id: string
  category: CapsuleCategory
  name: string
  note?: string
  imageUrl?: string
  color?: string
  // Optional freeform/preset subtype within the category (e.g. "tee",
  // "sneakers") — same vocabulary as VisualBoard.wardrobeSubtype,
  // display-only, never affects grouping or matching.
  subtype?: string
}

export interface OutfitBoard {
  id: string
  dayId: string
  itemNames: string[]
  note: string
  imageUrl?: string
  // Distinguishes multiple looks on the same day (e.g. "Travel Day to
  // Austin" vs "Franklin's BBQ") — see DayPlan.outfitBoardIds. Optional
  // since a single-look day (the common case, e.g. every France day)
  // never needs one; `note` alone is enough to read there.
  label?: string
}

export interface TripMeta {
  id: string
  name: string
  destinationLabel: string
  startDate: ISODate
  endDate: ISODate
  // IANA zone name for this trip's destination (e.g. "America/Chicago",
  // "Europe/Paris") — the default every leg resolves to unless it sets
  // its own Leg.timeZone. Without this, "today"/"next up"/leave-by/alert
  // logic would silently use the device's own timezone, which is wrong
  // whenever the traveler opens the app before actually arriving (e.g.
  // checking a Paris itinerary from a phone still set to US time). See
  // lib/timezone.ts.
  timeZone?: string
  travelers: Traveler[]
  homeCurrency: string
  tripCurrency: string
  status: 'upcoming' | 'active' | 'past'
  coverImageUrl?: string
  coverAlt?: string // alt text for coverImageUrl; falls back to a generic description if unset
  coverPosition?: string // CSS object-position, e.g. "center 30%", for responsive cropping
  weatherDisclaimer?: string
  budgetNote?: string
  outfitBoardImageUrl?: string // full capsule + daily-outfit board, for the Pack lightbox
}

// A real-world place whose live weather is worth showing for this trip —
// see lib/weather.ts. Public/decorative data, safe in Share mode like the
// rest of the readiness card. relatedLegId ties it to Leg.id/DayPlan.legId
// so a day's weather can be looked up generically (getWeatherLocationForDay
// in lib/weather.ts) instead of any page hardcoding a city name; a single
// location can cover more than one leg (e.g. an outbound and a return visit
// to the same city) via an array.
export interface WeatherLocation {
  id: string
  name: string
  city: string
  country?: string
  latitude?: number
  longitude?: number
  relatedLegId?: string | string[]
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
  // Stay checkout date — or, for a 'rental-car' transport item, its
  // return/drop-off date. A rental with a real endDate later than date
  // is treated as proof of a genuine multi-day round trip on its own;
  // see lib/manualItems.ts rentalCoversRoundTrip.
  endDate?: ISODate
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
  travelMinutes?: number // see TravelTiming above
  arrivalBufferMinutes?: number
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

// A traveler-uploaded visual reference — a daily outfit photo, a capsule/
// packing flat-lay, a mood/inspiration collage, a city or neighborhood
// screenshot, or anything else worth keeping alongside the trip. Works
// for any trip generically (never hardcodes a trip id), the same way
// ManualTripItem does: stored client-side in useAppStore as a flat array
// filtered by tripId, converted to nothing else — this is purely user
// content, never merged into a trip's seeded OutfitBoard/CapsuleItem
// arrays. The image itself lives in IndexedDB (see lib/visualBoards.ts),
// never localStorage/git/public — only this metadata is persisted here.
export type VisualBoardType = 'outfit' | 'capsule' | 'packing' | 'shoes' | 'accessories' | 'mood' | 'city' | 'other'

export interface VisualBoard {
  id: string
  tripId: string
  type: VisualBoardType
  title: string
  dayId?: string // ties it to a DayPlan.id — omitted means "the trip generally"
  date?: ISODate // mirrors the chosen day's date, for sorting/display without a days[] lookup
  imageKey: string // storage key into lib/visualBoards.ts's IndexedDB wallet
  notes?: string
  createdAt: string // ISO timestamp
  // When a day has more than one 'outfit'-type board, marks which one a
  // single-outfit surface (Today's "Today's outfit" card) should lead
  // with — see lib/visualBoards.ts findDayVisualBoards. Never required:
  // with none marked, the earliest-created board leads.
  primaryForDay?: boolean
  // Distinguishes a true multi-item board upload (a collage, a whole
  // outfit photo, a themed flat-lay) from a single wardrobe piece (one
  // top, one pair of shoes, ...). Absent or 'board' preserves every
  // existing upload's behavior unchanged — only an explicit
  // 'wardrobe-item' entry is pulled out of Pack's Boards tab and
  // rendered in the Wardrobe tab instead, grouped by wardrobeCategory
  // (see lib/visualBoards.ts isWardrobeItemBoard and
  // lib/wardrobeOutfits.ts ResolvedWardrobeItem/resolveOutfitItems,
  // which lets an Outfit reference this the same way it references a
  // seeded CapsuleItem). `type` is unused/ignored on a 'wardrobe-item'
  // entry (kept required on the type for simplicity — every write path
  // sets it to a neutral default).
  visualKind?: 'board' | 'wardrobe-item'
  // Only set when visualKind === 'wardrobe-item' — the same category
  // vocabulary as CapsuleCategory (Tops/Bottoms/Dresses/... ) so an
  // uploaded piece groups identically alongside seeded capsule items.
  wardrobeCategory?: CapsuleCategory
  // Optional freeform/preset subtype within the category (e.g. "tee",
  // "sneakers") — display-only, never affects grouping or matching.
  wardrobeSubtype?: string
}

// A real outfit — a named, referenced group of actual wardrobe pieces
// (CapsuleItem ids), as opposed to OutfitBoard's older "itemNames" text
// scaffold matched fuzzily against loose photo uploads. Each id in
// itemIds points at an existing CapsuleItem; that item's own image (a
// seeded public photo, or a private one the traveler uploaded under the
// `capsule-${tripId}-${itemId}` IndexedDB key — see
// components/wardrobe/WardrobeItemThumb.tsx) is the only place its
// picture lives, so an outfit never owns or duplicates image data of
// its own. Used two ways with the same shape: seeded directly on
// Trip.outfits (e.g. Austin's six looks — safe to seed since it's pure
// text/id references, no image blobs), or traveler-created via the
// "Create outfit" flow and stored in useAppStore's flat, tripId-filtered
// outfits array, exactly like every other client-side-only entity
// (ManualTripItem, VisualBoard). A day can carry more than one outfit
// (e.g. Austin's Sept 9 has two) simply by more than one Outfit sharing
// the same dayId — no plural-field workaround needed.
export interface Outfit {
  id: string
  tripId: string
  name: string
  dayId?: string // omitted means "not assigned to a specific day"
  sortOrder: number
  itemIds: string[]
  notes?: string
  primaryForDay?: boolean
}

export interface Trip {
  meta: TripMeta
  legs: Leg[]
  days: DayPlan[]
  bookings: Booking[]
  transport: Transport[]
  capsule: CapsuleItem[]
  outfitBoards: OutfitBoard[]
  // Seeded Outfits (see Outfit above) — the current, reference-based way
  // to author a trip's known outfits. Optional/empty for trips (like
  // France) still on the older OutfitBoard/itemNames scaffold, which
  // keeps rendering unchanged wherever this is absent.
  outfits?: Outfit[]
  // Traveler-selected personal sessions for any multi-track event this
  // trip includes (see EventSession above) — optional/empty for every
  // trip without one, same pattern as `outfits`.
  eventSessions?: EventSession[]
  openItems: OpenItem[]
  packingList?: PackingItem[] // a plain checklist, for trips without a styled capsule wardrobe
  resources?: TravelResource[] // public reference links, e.g. an official transit map
  weatherLocations?: WeatherLocation[] // see lib/weather.ts
}
