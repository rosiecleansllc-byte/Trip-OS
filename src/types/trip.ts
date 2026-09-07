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

export interface ScheduleItem {
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

export interface Booking {
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
  address?: string
  notes?: string // private — stripped in Share mode
  tip?: string // public — survives Share mode
  cancellationDeadline?: ISODate
  bookingUrl?: string
}

export interface Transport {
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
