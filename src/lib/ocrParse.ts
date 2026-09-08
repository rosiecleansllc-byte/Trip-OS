import type { ManualItemStatus, ManualItemType, ManualTransportMode } from '../types/trip'

// Deterministic, regex-based best-effort extraction from raw OCR text —
// deliberately not a general NLP/ML parser. Every field here either comes
// straight from a recognizable pattern in the text or is left blank; none
// of this invents a value the screenshot didn't actually contain. Callers
// merge the result over an empty form, so a field this can't find just
// stays exactly as blank as if the traveler had opened the manual form.

export interface ParsedFields {
  title?: string
  date?: string // YYYY-MM-DD, matches <input type=date>
  endDate?: string
  time?: string // HH:mm, matches <input type=time>
  endTime?: string
  location?: string
  address?: string
  phone?: string
  cost?: string
  currency?: string
  confirmationCode?: string
  fromLocation?: string
  toLocation?: string
  transportMode?: ManualTransportMode
  carrier?: string
  partySize?: string
  status?: ManualItemStatus
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Infers a sensible year for a date the screenshot only gave month/day
// for, by picking whichever of {tripYear, tripYear+1} keeps the date on
// or after the trip's own start date — trip screenshots are booked before
// or during travel, never referencing a date from before the trip began.
function inferYear(month: number, day: number, referenceISODate: string): number {
  const refYear = Number(referenceISODate.slice(0, 4))
  const candidate = `${refYear}-${pad(month)}-${pad(day)}`
  if (candidate >= referenceISODate.slice(0, 4) + '-01-01') {
    // If this date, using the reference year, falls before the trip
    // starts by more than ~2 months, it's more likely next year's date
    // (e.g. booking made in December for a January trip).
    const refMonth = Number(referenceISODate.slice(5, 7))
    if (month < refMonth - 2) return refYear + 1
  }
  return refYear
}

function toISODate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  return `${year}-${pad(month)}-${pad(day)}`
}

// Finds the first date-like substring in `text` and returns it as
// YYYY-MM-DD, trying (in order) ISO, "Month D, YYYY" / "D Month YYYY",
// and "M/D/YYYY". `referenceISODate` supplies the year when the text
// only gives month/day.
export function extractDate(text: string, referenceISODate: string): string | undefined {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) return toISODate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')
  const monthDayYear = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(20\\d{2})?\\b`, 'i')
  const m1 = text.match(monthDayYear)
  if (m1) {
    const month = MONTHS[m1[1].toLowerCase()]
    const day = Number(m1[2])
    const year = m1[3] ? Number(m1[3]) : inferYear(month, day, referenceISODate)
    const iso2 = toISODate(year, month, day)
    if (iso2) return iso2
  }

  const dayMonthYear = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\.?,?\\s*(20\\d{2})?\\b`, 'i')
  const m2 = text.match(dayMonthYear)
  if (m2) {
    const day = Number(m2[1])
    const month = MONTHS[m2[2].toLowerCase()]
    const year = m2[3] ? Number(m2[3]) : inferYear(month, day, referenceISODate)
    const iso3 = toISODate(year, month, day)
    if (iso3) return iso3
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2}|\d{2})\b/)
  if (slash) {
    const month = Number(slash[1])
    const day = Number(slash[2])
    const year = slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])
    return toISODate(year, month, day)
  }

  return undefined
}

// Finds a date on whichever line matches `labelPattern` — used for the
// very common "Check-in: <date>" / "Check-out: <date>" layout, where the
// two dates are on separate lines rather than a single "11-13" range.
function extractLabeledDate(text: string, labelPattern: RegExp, referenceISODate: string): string | undefined {
  const line = text.split('\n').find((l) => labelPattern.test(l))
  return line ? extractDate(line, referenceISODate) : undefined
}

// Check-in/check-out dates for a stay, as [checkIn, checkOut] in
// YYYY-MM-DD. Tries explicitly-labeled "Check-in:" / "Check-out:" lines
// first (the more common layout in real hotel confirmations), then falls
// back to a single-line "Sep 11-13" / "Sep 11 - Sep 13" style range.
export function extractDateRange(text: string, referenceISODate: string): [string?, string?] {
  const checkIn = extractLabeledDate(text, /check[- ]?in/i, referenceISODate)
  const checkOut = extractLabeledDate(text, /check[- ]?out/i, referenceISODate)
  if (checkIn || checkOut) return [checkIn, checkOut]

  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')
  const range = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})\\s*(?:-|–|to)\\s*(?:(${monthNames})\\.?\\s+)?(\\d{1,2}),?\\s*(20\\d{2})?\\b`, 'i')
  const m = text.match(range)
  if (!m) return [undefined, undefined]
  const startMonth = MONTHS[m[1].toLowerCase()]
  const startDay = Number(m[2])
  const endMonth = m[3] ? MONTHS[m[3].toLowerCase()] : startMonth
  const endDay = Number(m[4])
  const year = m[5] ? Number(m[5]) : inferYear(startMonth, startDay, referenceISODate)
  return [toISODate(year, startMonth, startDay), toISODate(year, endMonth, endDay)]
}

// First "H:MM AM/PM" or 24-hour "HH:MM" in the text, as 24-hour "HH:mm".
export function extractTime(text: string): string | undefined {
  const ampm = text.match(/\b(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)\b/)
  if (ampm) {
    let h = Number(ampm[1]) % 12
    if (/p/i.test(ampm[3])) h += 12
    return `${pad(h)}:${ampm[2]}`
  }
  const clock24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*[AaPp][Mm])/)
  if (clock24) return `${pad(Number(clock24[1]))}:${clock24[2]}`
  return undefined
}

// All H:MM-ish matches in order, for pulling a depart+arrive or
// start+end pair out of one screenshot.
export function extractAllTimes(text: string): string[] {
  const out: string[] = []
  const re = /\b(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)?\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m[3]) {
      let h = Number(m[1]) % 12
      if (/p/i.test(m[3])) h += 12
      out.push(`${pad(h)}:${m[2]}`)
    } else {
      const h = Number(m[1])
      if (h <= 23) out.push(`${pad(h)}:${m[2]}`)
    }
  }
  return out
}

const CURRENCY_SYMBOL: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP' }

function extractAmountFromLine(line: string): { cost?: string; currency?: string } {
  const m = line.match(/([$€£])\s?(\d{1,3}(?:[,.]\d{3})*(?:\.\d{2})?)/)
  if (m) {
    const amount = m[2].replace(/,/g, '')
    return { cost: amount, currency: CURRENCY_SYMBOL[m[1]] }
  }
  const code = line.match(/\b(USD|EUR|GBP)\s?(\d{1,3}(?:[,.]\d{3})*(?:\.\d{2})?)/i)
  if (code) return { cost: code[2].replace(/,/g, ''), currency: code[1].toUpperCase() }
  return {}
}

// Checked in this order — a confirmation showing a room subtotal, taxes,
// and a final total (the classic Booking.com layout) should never end up
// with the subtotal, so "grand total"/"total price"/etc. all outrank a
// bare "total", which in turn outranks "price" (too easily a per-night or
// per-item figure rather than what's actually owed).
const TOTAL_LABEL_PRIORITY = [
  /grand\s*total/i,
  /total\s*price/i,
  /amount\s*paid/i,
  /payment\s*total/i,
  /\btotal\b/i,
  /\bprice\b/i,
]

function findLabeledAmount(lines: string[], labelPattern: RegExp): { cost?: string; currency?: string } | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelPattern.test(lines[i])) continue
    const sameLine = extractAmountFromLine(lines[i])
    if (sameLine.cost) return sameLine
    // Some layouts put the label and the amount on separate lines
    // ("Total\n$353.97").
    const nextLine = lines[i + 1] ? extractAmountFromLine(lines[i + 1]) : {}
    if (nextLine.cost) return nextLine
  }
  return undefined
}

// Prefers whichever amount is actually labeled as the total the traveler
// owes/paid, rather than just the first dollar figure on the page — a
// hotel confirmation showing "Room: $300 / Taxes: $54 / Total: $354"
// should extract $354, not $300. Falls back to the first amount anywhere
// only when nothing on the page is labeled as a total.
export function extractCost(text: string): { cost?: string; currency?: string } {
  const lines = text.split('\n')
  for (const labelPattern of TOTAL_LABEL_PRIORITY) {
    const found = findLabeledAmount(lines, labelPattern)
    if (found) return found
  }
  return extractAmountFromLine(text)
}

export function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/)
  return m?.[1].trim()
}

const CONFIRMATION_LABELS = [
  'confirmation number', 'confirmation code', 'confirmation #', 'confirmation',
  'booking reference', 'booking number', 'booking ref', 'reservation number',
  'reservation code', 'reservation #', 'order number', 'order #', 'pnr', 'record locator',
]

export function extractConfirmationCode(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const label of CONFIRMATION_LABELS) {
    const idx = lower.indexOf(label)
    if (idx === -1) continue
    const rest = text.slice(idx + label.length)
    const code = rest.match(/[:\s#-]*([A-Z0-9]{4,10})\b/)
    if (code && !/^\d{4}$/.test(code[1])) return code[1] // skip bare 4-digit years/times
  }
  return undefined
}

const STREET_SUFFIXES = /\b(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Suite|Ste|Hwy|Highway|Pkwy|Parkway)\b/i
const ZIP = /\b\d{5}(-\d{4})?\b/

export function extractAddress(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const line = lines.find((l) => STREET_SUFFIXES.test(l) || (ZIP.test(l) && l.length < 80))
  return line
}

// "ATL → AUS", "ATL to AUS", "ATL-AUS", or "Atlanta (ATL) to Austin (AUS)".
export function extractAirportPair(text: string): { from?: string; to?: string } {
  const withCity = text.match(/\(([A-Z]{3})\)\s*(?:to|→|->|-)\s*[A-Za-z .]*\(([A-Z]{3})\)/)
  if (withCity) return { from: withCity[1], to: withCity[2] }
  const bare = text.match(/\b([A-Z]{3})\s*(?:→|->|to)\s*([A-Z]{3})\b/)
  if (bare) return { from: bare[1], to: bare[2] }
  return {}
}

const CARRIERS = [
  'Frontier Airlines', 'Frontier', 'Delta Air Lines', 'Delta', 'American Airlines', 'United Airlines',
  'Southwest Airlines', 'Southwest', 'JetBlue', 'Spirit Airlines', 'Spirit', 'Alaska Airlines',
  'Air France', 'British Airways', 'Lufthansa', 'Amtrak', 'Greyhound', 'Uber', 'Lyft',
]

export function extractCarrier(text: string): string | undefined {
  return CARRIERS.find((c) => text.toLowerCase().includes(c.toLowerCase()))
}

const TRANSPORT_MODE_HINTS: [RegExp, ManualTransportMode][] = [
  [/\b(flight|airlines?|boarding pass|gate|terminal)\b/i, 'flight'],
  [/\b(train|amtrak|rail)\b/i, 'train'],
  [/\b(uber|lyft|rideshare)\b/i, 'rideshare'],
  [/\b(bus|greyhound)\b/i, 'bus'],
  [/\b(rental car|hertz|avis|enterprise|budget rent)\b/i, 'rental-car'],
]

export function extractTransportMode(text: string): ManualTransportMode | undefined {
  return TRANSPORT_MODE_HINTS.find(([re]) => re.test(text))?.[1]
}

export function extractPartySize(text: string): string | undefined {
  const m = text.match(/\b(?:party of|table for|guests?:?)\s*(\d{1,2})\b/i)
  return m?.[1]
}

export function extractTicketQuantity(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})\s*(?:tickets?|x\s*ticket|admissions?)\b/i) || text.match(/\bqty:?\s*(\d{1,2})\b/i)
  return m?.[1]
}

const SKIP_TITLE_LINE = /^(confirmation|confirmed|booking|reservation|receipt|order|status|check[- ]?in|check[- ]?out|date|time|total|guest|address|phone|www\.|http)/i

// Platform/OTA/ticketing chrome that shows up as its own line (usually a
// logo or page header) in a screenshot but is never the actual hotel/
// restaurant/event name — e.g. a Booking.com hotel confirmation's title
// should be the property, not "Booking.com"; a Luma ticket's title should
// be the event, not "luma". Matched as "this line more or less just says
// the brand name," not "this line mentions the brand anywhere," so a
// venue that happens to be named after a company isn't wrongly excluded.
const BRANDING_NAMES = [
  'booking.com', 'luma', 'lu.ma', 'covermanager', 'google', 'expedia',
  'opentable', 'resy', 'airbnb', 'vrbo', 'hotels.com', 'tripadvisor',
  'eventbrite', 'ticketmaster', 'stubhub', 'yelp', 'grubhub', 'doordash',
]

function isBrandingLine(line: string): boolean {
  const norm = line.toLowerCase().replace(/[^a-z0-9. ]/g, '').trim()
  return BRANDING_NAMES.some((b) => {
    const bn = b.toLowerCase()
    return norm === bn || norm === bn.replace('.', '') || norm.startsWith(`powered by ${bn}`) || norm.startsWith(`via ${bn}`)
  })
}

function isSubstantiveLine(l: string): boolean {
  return (
    l.length >= 3 &&
    l.length <= 80 &&
    !SKIP_TITLE_LINE.test(l) &&
    !isBrandingLine(l) &&
    !/^\d+$/.test(l) &&
    !/^[$€£]/.test(l) &&
    !/\d{1,2}:\d{2}/.test(l)
  )
}

function substantiveLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).filter(isSubstantiveLine)
}

function cleanTitleValue(raw: string): string | undefined {
  const value = raw.trim().replace(/[.:,]+$/, '')
  if (value.length < 2 || value.length > 80) return undefined
  if (isBrandingLine(value)) return undefined
  return value
}

// Real confirmations from booking platforms almost always label the
// actual property/event name somewhere ("Hotel: ...", "Reservation at
// ...", "Event: ..."), either inline or as a label on its own line with
// the value on the next — and that's a far more reliable signal than
// "whatever line comes first," which on a Booking.com or Luma screenshot
// is the platform's own branding, not the trip item's name.
const TITLE_LABEL_WORDS = ['hotel', 'property', 'event', 'venue', 'location']

function extractLabeledTitle(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim())
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const phrase = line.match(/(?:reservation\s+at|booking\s+confirmation\s+for)\s*[:-]?\s*(.+)/i)
    if (phrase) {
      const value = cleanTitleValue(phrase[1])
      if (value) return value
    }

    const labelColon = line.match(/^(hotel|property|event|venue|location)\s*[:-]\s*(.+)/i)
    if (labelColon) {
      const value = cleanTitleValue(labelColon[2])
      if (value) return value
    }

    const bareLabel = line.match(new RegExp(`^(${TITLE_LABEL_WORDS.join('|')})\\s*:?$`, 'i'))
    if (bareLabel) {
      const next = lines.slice(i + 1).find((l) => l.length > 0)
      const value = next ? cleanTitleValue(next) : undefined
      if (value) return value
    }
  }
  return undefined
}

// Best guess at a title/name: prefer a value found next to an explicit
// label (extractLabeledTitle), and only fall back to "the first
// substantive, non-branding line" when no label is present.
export function guessTitle(text: string): string | undefined {
  return extractLabeledTitle(text) ?? substantiveLines(text)[0]
}

// For activities, the venue is often the next substantive line after the
// event name — used only as a fallback when that line isn't already
// claimed as the street address.
function guessVenue(text: string, title: string | undefined, address: string | undefined): string | undefined {
  // Since guessTitle now prefers a labeled line ("Event: ...") over just
  // "whichever line comes first," the venue can no longer be assumed to
  // be "the second substantive line" — that line might be the very same
  // one the title was read from. Exclude whichever line actually produced
  // the title (it may carry a label prefix the title itself doesn't, e.g.
  // "Event: You x AI Summit" vs. title "You x AI Summit"), then take the
  // next remaining substantive line that isn't the address either.
  return substantiveLines(text).find((l) => l !== address && !(title && l.includes(title)))
}

function paymentIndicatesPaid(text: string): boolean {
  return /\b(paid in full|payment (received|confirmed)|amount charged|charged to)\b/i.test(text)
}

export function parseFieldsForType(type: ManualItemType, text: string, tripStartDate: string): ParsedFields {
  const cost = extractCost(text)
  const confirmationCode = extractConfirmationCode(text)
  const phone = extractPhone(text)

  if (type === 'stay') {
    const [rangeStart, rangeEnd] = extractDateRange(text, tripStartDate)
    const date = rangeStart ?? extractDate(text, tripStartDate)
    return {
      title: guessTitle(text),
      date,
      endDate: rangeEnd,
      time: extractTime(text),
      address: extractAddress(text),
      phone,
      cost: cost.cost,
      currency: cost.currency,
      confirmationCode,
      status: 'confirmed',
    }
  }

  if (type === 'transport') {
    const { from, to } = extractAirportPair(text)
    const times = extractAllTimes(text)
    return {
      fromLocation: from,
      toLocation: to,
      date: extractDate(text, tripStartDate),
      time: times[0],
      endTime: times[1],
      transportMode: extractTransportMode(text) ?? (from && to ? 'flight' : undefined),
      carrier: extractCarrier(text),
      cost: cost.cost,
      currency: cost.currency,
      confirmationCode,
      status: 'confirmed',
    }
  }

  if (type === 'restaurant') {
    return {
      title: guessTitle(text),
      date: extractDate(text, tripStartDate),
      time: extractTime(text),
      partySize: extractPartySize(text),
      address: extractAddress(text),
      phone,
      confirmationCode,
      status: 'confirmed',
    }
  }

  // activity
  const times = extractAllTimes(text)
  const address = extractAddress(text)
  const activityTitle = guessTitle(text)
  return {
    title: activityTitle,
    date: extractDate(text, tripStartDate),
    time: times[0],
    endTime: times[1],
    location: guessVenue(text, activityTitle, address),
    address,
    confirmationCode,
    partySize: extractTicketQuantity(text),
    status: paymentIndicatesPaid(text) ? 'paid' : 'confirmed',
  }
}
