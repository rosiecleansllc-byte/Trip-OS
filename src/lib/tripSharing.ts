import type { Booking, LinkActions, ScheduleItem, Transport, Trip } from '../types/trip'
import { createTrip } from './createTrip'

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid shared trip.')
  return v as Record<string, unknown>
}
const str = (v: unknown, fallback = '') => typeof v === 'string' ? v.slice(0, 5000) : fallback
const required = (v: unknown) => { const value = str(v).trim(); if (!value) throw new Error('The shared trip is missing required details.'); return value }
const list = (v: unknown, max = 2000): unknown[] => { if (!Array.isArray(v) || v.length > max) throw new Error('Invalid shared trip list.'); return v }
const date = (v: unknown) => { const value = required(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) throw new Error('Invalid trip date.'); return value }
const time = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : undefined
const zone = (v: unknown, fallback: string) => { try { const value = required(v); new Intl.DateTimeFormat('en', { timeZone: value }).format(); return value } catch { return fallback } }
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
function publicUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return
  try { const url = new URL(v); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return }
}
function links(r: Record<string, unknown>): LinkActions {
  return { websiteUrl: publicUrl(r.websiteUrl), ticketUrl: publicUrl(r.ticketUrl), reservationUrl: publicUrl(r.reservationUrl), menuUrl: publicUrl(r.menuUrl), phone: /^\+?[\d ()-]{3,30}$/.test(str(r.phone)) ? str(r.phone) : undefined }
}
function money(v: unknown) {
  if (!v || typeof v !== 'object') return undefined
  const r = record(v); const amount = number(r.amount); const currency = str(r.currency)
  return amount !== undefined && /^[A-Z]{3}$/.test(currency) ? { amount, currency } : undefined
}
const status = (v: unknown): Booking['status'] => ['confirmed','paid','pending','optional','cancelled'].includes(str(v)) ? v as Booking['status'] : 'pending'
const category = (v: unknown): Booking['category'] => ['hotel','dining','ticket','activity','other'].includes(str(v)) ? v as Booking['category'] : 'other'
const mode = (v: unknown): Transport['mode'] => ['flight','train','local','car'].includes(str(v)) ? v as Transport['mode'] : 'local'
const itemType = (v: unknown): ScheduleItem['type'] => ['activity','meal','transport','free','lodging'].includes(str(v)) ? v as ScheduleItem['type'] : 'free'

// Explicit allowlist used BOTH on export and import. Private notes, codes,
// stored files, personal cover images and modify/ticket tokens never pass.
export function publicTripSnapshot(value: unknown): Trip {
  const r = record(value); const m = record(r.meta)
  const startDate = date(m.startDate); const endDate = date(m.endDate)
  const base = createTrip({ name: required(m.name), destination: required(m.destinationLabel), startDate, endDate,
    timeZone: str(m.timeZone, 'UTC'), currency: required(m.tripCurrency), travelers: '' }, required(m.id))
  base.meta.travelers = list(m.travelers, 100).map((v, i) => ({ id: `traveler-${i}`, name: required(record(v).name) }))
  base.meta.homeCurrency = /^[A-Z]{3}$/.test(str(m.homeCurrency)) ? str(m.homeCurrency) : 'USD'
  base.legs = list(r.legs, 100).map((v,i) => { const x = record(v); return { id: required(x.id), name: required(x.name), order: i + 1, timeZone: zone(x.timeZone, base.meta.timeZone ?? 'UTC') } })
  if (!base.legs.length) base.legs = [{ id: 'destination', name: base.meta.destinationLabel, order: 1 }]
  const validLeg = (v: unknown) => base.legs.some(l => l.id === str(v)) ? str(v) : base.legs[0].id
  const validDays = new Set(base.days.map(d => d.date))
  base.days = list(r.days, 366).map((v,i) => {
    const d = record(v); const dayDate = date(d.date)
    if (!validDays.has(dayDate)) throw new Error('Shared day is outside the trip dates.')
    return { id: required(d.id), date: dayDate, dayNumber: i + 1, legId: validLeg(d.legId), title: required(d.title), outfitNote: '',
      scheduleItems: list(d.scheduleItems, 500).filter(v => record(v).isPrivate !== true).map(v => { const x = record(v); return { id: required(x.id), label: required(x.label), type: itemType(x.type), time: time(x.time), location: str(x.location) || undefined, tip: str(x.tip) || undefined, cancelled: x.cancelled === true, travelMinutes: number(x.travelMinutes), arrivalBufferMinutes: number(x.arrivalBufferMinutes), ...links(x) } }) }
  })
  if (base.days.length !== validDays.size || new Set(base.days.map(d => d.date)).size !== validDays.size) throw new Error('The shared itinerary has missing or duplicate days.')
  base.days.sort((a,b) => a.date.localeCompare(b.date))
  base.days.forEach((d,i) => { d.dayNumber = i + 1 })
  base.bookings = list(r.bookings).map(v => { const x = record(v); return { id: required(x.id), name: required(x.name), category: category(x.category), legId: validLeg(x.legId), dateStart: date(x.dateStart), dateEnd: x.dateEnd ? date(x.dateEnd) : undefined, time: time(x.time), status: status(x.status), cost: money(x.cost), isPointsBooking: x.isPointsBooking === true, address: str(x.address) || undefined, tip: str(x.tip) || undefined, ...links(x) } })
  base.transport = list(r.transport).map(v => { const x = record(v); return { id: required(x.id), mode: mode(x.mode), from: required(x.from), to: required(x.to), date: date(x.date), departTime: time(x.departTime), arriveTime: time(x.arriveTime), carrier: str(x.carrier) || undefined, number: str(x.number) || undefined, status: status(x.status), cost: money(x.cost), location: str(x.location) || undefined, tip: str(x.tip) || undefined, ...links(x) } })
  base.openItems = []
  return base
}
