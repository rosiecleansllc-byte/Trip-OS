import type { DayPlan } from '../types/trip'

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

export function tripPhase(startDate: string, endDate: string, now: Date = new Date()): 'pre' | 'active' | 'post' {
  const untilStart = daysUntil(startDate, now)
  const untilEnd = daysUntil(endDate, now)
  if (untilStart > 0) return 'pre'
  if (untilEnd < 0) return 'post'
  return 'active'
}
