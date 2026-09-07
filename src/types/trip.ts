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
// privateTicketUrl, modifyUrl, and privateDocumentUrl are PRIVATE and must
// NEVER render in Share mode — see components/ui/ActionRow.tsx, which
// enforces this centrally so no page can accidentally leak one:
//   - modifyUrl carries a personal manage/cancel token for the booking.
//   - privateTicketUrl is the traveler's own purchased ticket: the actual
//     e-ticket/PDF/QR-code link from the confirmation email. NEVER put a
//     personal ticket link in `ticketUrl` — that field is the public
//     info/purchase page (e.g. the museum's ticketing site), not the
//     traveler's redeemable ticket. Use `ticketUrl` for "where anyone
//     buys a ticket" and `privateTicketUrl` for "this trip's actual
//     ticket" — the two are rendered differently by ActionRow (see below)
//     specifically so the private one can never leak into Share mode.
//   - privateDocumentUrl is a photo/screenshot of the traveler's own
//     reservation confirmation, order receipt, or QR-code ticket — a
//     personal document image, not a link. It's a different shape of
//     private asset than privateTicketUrl (which is a URL to an external
//     ticket page/PDF): this one renders in-app via a full-screen
//     Lightbox rather than opening a new tab. Use privateDocumentLabel to
//     set the button text ("View ticket" / "View reservation" / "View
//     confirmation") — it defaults to "View document" if omitted. NEVER
//     put a personal document image in a public field; it must only ever
//     reach the DOM through privateDocumentUrl so ActionRow's Share-mode
//     check is the single gate on it.
//
// ActionRow's Ticket button: outside Share mode it prefers
// privateTicketUrl (opens the traveler's actual ticket) and falls back to
// ticketUrl. In Share mode it only ever considers ticketUrl — if a
// privateTicketUrl exists but no public ticketUrl, the Ticket button is
// hidden entirely in Share mode rather than falling back to the private
// link. The privateDocumentUrl button follows the same rule as modifyUrl:
// rendered only outside Share mode, with no public fallback.
export interface LinkActions {
  websiteUrl?: string
  ticketUrl?: string // public — the info/purchase page anyone can use
  reservationUrl?: string
  menuUrl?: string
  phone?: string
  privateTicketUrl?: string // private — this traveler's actual e-ticket/PDF/QR
  modifyUrl?: string // private — manage/cancel link
  privateDocumentUrl?: string // private — photo of a reservation confirmation, receipt, or QR ticket
  privateDocumentLabel?: string // button text for privateDocumentUrl, e.g. "View ticket"
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

export interface PrepItem {
  id: string
  label: string
  detail?: string
  status: 'pending' | 'done'
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

export interface Trip {
  meta: TripMeta
  legs: Leg[]
  days: DayPlan[]
  bookings: Booking[]
  transport: Transport[]
  capsule: CapsuleItem[]
  outfitBoards: OutfitBoard[]
  prepItems: PrepItem[]
}
