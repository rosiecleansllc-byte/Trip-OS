import type { ManualItemType, ManualTripItem } from '../types/trip'
import { extractDate, extractTime } from './ocrParse'
export interface ItineraryDraft { title: string; date: string; time: string; type: ManualItemType; notes: string; selected: boolean }
const section = /^(BREAKFAST|EXPLORE|DINNER|BAR|MORNING|LUNCH|AFTERNOON|ACTIVITIES|DAYTIME|EARLY DINNER|DESSERT|ALTERNATIVE DINNER|DEPARTURE)(?:\s*[—·-].*)?$/i
const noise = /^(?:LIMA, PERU|VIEW DESTINATION|Tap |Plans |Arrival day:|Reserve |Confirm |Allow extra|Book your|La Mar is best|Anima e Cuore is also)/i
export function parseItinerary(text: string, reference: string): ItineraryDraft[] {
  const rows: ItineraryDraft[] = []
  let date = '', label = '', time = '', active = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[•●]\s*/, '')
    if (!line || noise.test(line)) continue
    const header = /^(?:(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*[·, -]+\s*)?(?:NOV(?:EMBER)?|JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|DEC(?:EMBER)?|20\d{2}-)\b/i.test(line)
    const found = header ? extractDate(line, reference) : undefined
    if (found) { date = found; active = false; label = ''; time = ''; continue }
    if (!date) continue
    if (section.test(line) || /^\d{1,2}:\d{2}\s*[AP]M/i.test(line)) { label = line; time = extractTime(line) ?? ''; active = true; continue }
    if (!active) continue
    if (time && rows.length && rows[rows.length - 1].date === date && rows[rows.length - 1].notes.startsWith(label + '.')) { rows[rows.length - 1].notes += ` ${line}`; continue }
    const alternative = /ALTERNATIVE|CHOOSE ONE/i.test(label) || /^Alternative:/i.test(line)
    const placeholder = /TBD|to be selected|restaurant TBD|lounge.*TBD/i.test(line)
    rows.push({ title: line, date, time, type: /BREAKFAST|LUNCH|DINNER|DESSERT/i.test(label) ? 'restaurant' : /DEPARTURE/i.test(label) ? 'other' : 'activity', notes: `${label}. Imported plan; booking and times need review.`, selected: !alternative && !placeholder })
    if (rows.length > 200) throw new Error('Import at most 200 entries at a time.')
  }
  return rows
}
export function itineraryKey(item: { title: string; date: string }) { return `${item.date}:${item.title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}` }
export function validateItineraryRow(row: ItineraryDraft) {
  return Boolean(row.title.trim() && row.title.length <= 300 && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(Date.parse(`${row.date}T12:00:00Z`)) && new Date(`${row.date}T12:00:00Z`).toISOString().slice(0,10) === row.date && (!row.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)))
}
export function draftToInput(row: ItineraryDraft, tripId: string): Omit<ManualTripItem, 'id' | 'createdAt'> {
  return { tripId, type: row.type, title: row.title.trim(), date: row.date, time: row.time || undefined, notes: row.notes, status: 'planned' }
}
