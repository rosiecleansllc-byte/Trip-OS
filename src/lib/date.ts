import type { DayPlan, ScheduleItem } from '../types/trip'

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateCompact(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(time?: string): string | undefined {
  if (!time) return undefined
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** e.g. "Sep 29, 4:00 PM" — for a full ISODateTime like a cancellation deadline. */
export function formatDateTimeCompact(iso: string): string {
  const [datePart, timePart] = iso.split('T')
  const date = formatDateCompact(datePart)
  const time = timePart ? formatTime(timePart.slice(0, 5)) : undefined
  return time ? `${date}, ${time}` : date
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = parseISODate(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = target.getTime() - startOfToday.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export function isSameISODate(iso: string, now: Date = new Date()): boolean {
  return daysUntil(iso, now) === 0
}

/** Find the day whose date matches "today", if the trip is currently underway. */
export function findCurrentDay(days: DayPlan[], now: Date = new Date()): DayPlan | undefined {
  return days.find((d) => isSameISODate(d.date, now))
}

/** Find the next day that hasn't happened yet (today or in the future). */
export function findNextDay(days: DayPlan[], now: Date = new Date()): DayPlan | undefined {
  return [...days].sort((a, b) => a.date.localeCompare(b.date)).find((d) => daysUntil(d.date, now) >= 0)
}

// A schedule item's position on a 0–1439 "minutes since midnight" scale:
// its real `time` when it has one, else its `sortOrder` placeholder (see
// types/trip.ts ScheduleItem), else Infinity for an item with neither —
// shared by findNextScheduleItem below and getEffectiveTrip's day merge
// (lib/manualItems.ts) so "what counts as having happened already" and
// "what order does the day render in" never disagree with each other.
export function scheduleSortValue(item: ScheduleItem): number {
  if (item.time) {
    const [h, m] = item.time.split(':').map(Number)
    return h * 60 + m
  }
  if (item.sortOrder != null) return item.sortOrder
  // Imported plans retain their section heading in notes, including entries
  // already saved on a traveler's device. Use it only as an ordering hint;
  // keep the actual time blank until the traveler chooses one.
  const section = item.notes?.match(/^([^.]*)\. Imported plan;/i)?.[1].trim().toUpperCase()
  if (section) {
    if (/^BREAKFAST\b/.test(section)) return 9 * 60
    if (/^(MORNING|DAYTIME|EXPLORE|ACTIVITIES)\b/.test(section)) return 10 * 60
    if (/^LUNCH\b/.test(section)) return 13 * 60
    if (/^AFTERNOON\b/.test(section)) return 14 * 60
    if (/^DESSERT\b/.test(section)) return 16 * 60
    if (/^EARLY DINNER\b/.test(section)) return 17 * 60
    if (/^(DINNER|ALTERNATIVE DINNER)\b/.test(section)) return 19 * 60
    if (/^BAR\b/.test(section)) return 21 * 60
  }
  return Number.POSITIVE_INFINITY
}

// Which schedule item is "next" right now, and which comes after it — so
// Today can lead with a single upcoming item instead of the whole day's
// list. Items are assumed to already be authored in chronological order;
// this just finds the last item (by scheduleSortValue) that has already
// passed and treats whatever follows it as next. An item with neither a
// real `time` nor a `sortOrder` never counts as "passed" on its own, so a
// run of such items at the end of the day all remain eligible — the
// first of them is "next".
export function findNextScheduleItem(
  items: ScheduleItem[],
  now: Date = new Date()
): { next?: ScheduleItem; after?: ScheduleItem } {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  let lastPastIndex = -1
  items.forEach((item, i) => {
    const value = scheduleSortValue(item)
    if (!Number.isFinite(value)) return
    if (value <= nowMinutes) lastPastIndex = i
  })
  const nextIndex = lastPastIndex + 1
  return { next: items[nextIndex], after: items[nextIndex + 1] }
}

export function tripPhase(startDate: string, endDate: string, now: Date = new Date()): 'pre' | 'active' | 'post' {
  const untilStart = daysUntil(startDate, now)
  const untilEnd = daysUntil(endDate, now)
  if (untilStart > 0) return 'pre'
  if (untilEnd < 0) return 'post'
  return 'active'
}
