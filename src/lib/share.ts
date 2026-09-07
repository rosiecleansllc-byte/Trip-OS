import type { Booking, ScheduleItem, Transport } from '../types/trip'

// Share mode strips anything private — confirmation codes, exact costs,
// personal notes — while keeping dates, places, and the high-level tips
// that are actually useful to share with someone else. Public action links
// (website/ticket/reservation/menu/phone) are NOT private and survive
// Share mode; only privateTicketUrl (the traveler's actual e-ticket/PDF/QR)
// and modifyUrl are private, and that's enforced centrally in ActionRow
// rather than here — see the LinkActions comment in types/trip.ts.

export function redactBooking(b: Booking): Booking {
  return {
    ...b,
    cost: null,
    confirmationCode: undefined,
    notes: undefined,
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
