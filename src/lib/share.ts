import type { Booking, ScheduleItem, Transport } from '../types/trip'

// Share mode strips anything private — confirmation codes, exact costs,
// personal notes — while keeping dates, places, and the high-level tips
// that are actually useful to share with someone else.

export function redactBooking(b: Booking): Booking {
  return {
    ...b,
    cost: null,
    confirmationCode: undefined,
    notes: undefined,
    bookingUrl: undefined,
  }
}

export function redactTransport(t: Transport): Transport {
  return {
    ...t,
    cost: null,
    confirmationCode: undefined,
    notes: undefined,
  }
}

export function redactScheduleItem(s: ScheduleItem): ScheduleItem | null {
  if (s.isPrivate) return null
  return { ...s, notes: undefined }
}
