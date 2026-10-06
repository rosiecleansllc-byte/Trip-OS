import type { DayPlan, ScheduleItem, Trip } from '../types/trip'
import { computeLeaveBy } from './leaveBy'
import { scheduleSortValue } from './date'

export type DayRunState = 'done' | 'next' | 'later'

export interface DayRunStep {
  item: ScheduleItem
  state: DayRunState
  leaveByLabel?: string
}

export function buildDayRunPlan(day: DayPlan, now: Date): DayRunStep[] {
  const ordered = day.scheduleItems
    .filter((item) => !item.cancelled)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => scheduleSortValue(a.item) - scheduleSortValue(b.item) || a.index - b.index)
    .map(({ item }) => item)

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nextIndex = ordered.findIndex((item) => {
    const value = scheduleSortValue(item)
    return !Number.isFinite(value) || value > nowMinutes
  })

  return ordered.map((item, index) => {
    const value = scheduleSortValue(item)
    const state: DayRunState =
      Number.isFinite(value) && value <= nowMinutes
        ? 'done'
        : nextIndex >= 0 && index === nextIndex
          ? 'next'
          : 'later'
    return {
      item,
      state,
      leaveByLabel: computeLeaveBy(item.time, item)?.leaveByLabel,
    }
  })
}

export function buildDayRouteMapUrl(
  trip: Trip,
  day: DayPlan,
  travelMode: 'walking' | 'driving' = 'walking'
): string | undefined {
  const transportLocations = trip.transport
    .filter((t) => t.date === day.date && t.status !== 'cancelled')
    .flatMap((t) => [t.location, t.from, t.to])
    .filter((value): value is string => Boolean(value))

  const scheduleLocations = day.scheduleItems
    .filter((item) => !item.cancelled && item.location)
    .map((item) => item.location!)

  const locations = [...transportLocations, ...scheduleLocations]
    .filter((value, index, list) => list.indexOf(value) === index)

  if (locations.length < 2) return undefined

  const origin = locations[0]
  const destination = locations[locations.length - 1]
  const waypoints = locations.slice(1, -1).slice(0, 8)

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: travelMode,
  })
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
