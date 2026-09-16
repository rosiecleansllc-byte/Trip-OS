import type { Booking, LinkActions, ScheduleItem, TravelResource, Transport } from '../types/trip'
import type { WalletDocEntry } from './walletDocs'

// The single source of truth for what a family member sees when Cecilia
// hands them her phone in Share mode.
//
// The rule is field-level, not card-level: a booking that carries one
// private field still shows its name, status, dates, times and cost —
// only the private field itself is withheld. Hiding a whole card because
// it contains a confirmation code is what made Share mode useless for
// following the itinerary.
//
// SHARED — what is booked and what it cost:
//   name/carrier/number, status (Confirmed/Planned/Canceled), dates and
//   times, addresses and locations, cost and amount paid, public tips,
//   and public links (venue website, directions, reservation info page,
//   menu, phone).
//
// WITHHELD — anything that could be used to *control* the reservation, or
// that is the traveler's own private material:
//   confirmation codes and booking references, private notes, the
//   traveler's own e-ticket/QR/PDF (privateTicketUrl), locally-stored
//   confirmation documents (privateDocumentKey and friends), and the
//   modify/cancel link.
//
// Every helper here takes `shareMode` as a REQUIRED argument. That is
// deliberate: a default would mean a forgotten argument silently fails
// open and leaks. See ActionRow, which previously defaulted to false.

// Fields cleared from any record that carries them. Kept as one list so
// a new private field on Booking/Transport/ScheduleItem/ManualTripItem is
// redacted everywhere at once the moment it's added here.
const PRIVATE_RECORD_FIELDS = {
  confirmationCode: undefined,
  notes: undefined,
  privateTicketUrl: undefined,
  modifyUrl: undefined,
  privateDocumentKey: undefined,
  privateDocumentLabel: undefined,
  privateDocumentType: undefined,
} as const

export function shareSafeBooking(booking: Booking, shareMode: boolean): Booking {
  if (!shareMode) return booking
  return { ...booking, ...PRIVATE_RECORD_FIELDS }
}

export function shareSafeTransport(leg: Transport, shareMode: boolean): Transport {
  if (!shareMode) return leg
  return { ...leg, ...PRIVATE_RECORD_FIELDS }
}

// Returns null for an item the traveler explicitly marked private, so
// callers drop it from the list entirely rather than rendering a redacted
// husk. ScheduleItem.isPrivate previously had no enforcement anywhere.
export function shareSafeScheduleItem(item: ScheduleItem, shareMode: boolean): ScheduleItem | null {
  if (!shareMode) return item
  if (item.isPrivate) return null
  return { ...item, ...PRIVATE_RECORD_FIELDS }
}

export function shareSafeScheduleItems(items: ScheduleItem[], shareMode: boolean): ScheduleItem[] {
  if (!shareMode) return items
  return items.map((i) => shareSafeScheduleItem(i, shareMode)).filter((i): i is ScheduleItem => i !== null)
}

// Link policy, lifted out of ActionRow so any surface rendering actions
// gets the same answer. Public links survive; the traveler's own ticket
// and the modify/cancel link do not.
export function shareSafeActions(links: LinkActions, shareMode: boolean): LinkActions {
  if (!shareMode) return links
  return {
    ...links,
    privateTicketUrl: undefined,
    modifyUrl: undefined,
    privateDocumentKey: undefined,
    privateDocumentLabel: undefined,
    privateDocumentType: undefined,
  }
}

export function shareSafeResources(resources: TravelResource[], shareMode: boolean): TravelResource[] {
  if (!shareMode) return resources
  return resources.filter((r) => !r.isPrivate)
}

// Wallet document entries point at files stored on this device. In Share
// mode there is no safe subset: the entry exists only to open, replace or
// delete the file behind it.
export function shareSafeWalletEntries(entries: WalletDocEntry[], shareMode: boolean): WalletDocEntry[] {
  return shareMode ? [] : entries
}

// Whether a stored-document indicator may render. Knowing *which*
// confirmations are on file is itself a disclosure, even without opening
// them, so the badge is withheld the same way the document is.
export function canShowDocumentPresence(shareMode: boolean): boolean {
  return !shareMode
}
