import type { TravelTiming } from '../types/trip'
import { formatTime } from './date'

// Single source of truth for turning an item's own event time plus its
// optional TravelTiming (see types/trip.ts) into a "leave by" time.
// Never invents travelMinutes when it's missing — the caller still gets
// Directions, just no leave-by line.

export interface LeaveByResult {
  leaveByTime: string // HH:mm, 24-hour internal representation
  leaveByLabel: string // 12-hour AM/PM, e.g. "3:35 PM"
  totalMinutesBefore: number // travelMinutes + arrivalBufferMinutes
}

export function computeLeaveBy(eventTime: string | undefined, timing: TravelTiming): LeaveByResult | undefined {
  if (!eventTime || timing.travelMinutes == null) return undefined
  const [h, m] = eventTime.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined
  const totalMinutesBefore = timing.travelMinutes + (timing.arrivalBufferMinutes ?? 0)
  const eventMinutes = h * 60 + m
  const leaveMinutes = eventMinutes - totalMinutesBefore
  // A computed leave-by before midnight has ambiguous same-day meaning
  // (was it meant for the day before?) — omit rather than wrap/guess.
  if (leaveMinutes < 0) return undefined
  const lh = Math.floor(leaveMinutes / 60)
  const lm = leaveMinutes % 60
  const leaveByTime = `${String(lh).padStart(2, '0')}:${String(lm).padStart(2, '0')}`
  return { leaveByTime, leaveByLabel: formatTime(leaveByTime)!, totalMinutesBefore }
}
