import type { Trip } from '../types/trip'
import { daysUntil, formatTime, isSameISODate, tripPhase } from './date'
import { computeLeaveBy } from './leaveBy'
import { buildWalletDocEntries } from './walletDocs'

// Trip Alerts, generated fresh from trip data every time Trip OS opens
// or resumes — see the AppState.alertOverrides comment in useAppStore.ts
// for why nothing here is itself persisted. This file is the only place
// that decides what counts as an alert; the Alert Center, Today's
// banner, and the browser-notification bridge all just render/filter
// whatever generateAlerts returns.

export type AlertType =
  | 'leave-soon'
  | 'upcoming'
  | 'travel-day'
  | 'checkin'
  | 'checkout'
  | 'missing-document'
  | 'cancellation-deadline'
  | 'readiness'

export type AlertPriority = 'critical' | 'important' | 'info'
export type AlertGroup = 'now' | 'today' | 'upcoming'

export interface TripAlert {
  id: string // deterministic — stable across regenerations, see useAppStore alertOverrides
  type: AlertType
  priority: AlertPriority
  group: AlertGroup
  title: string
  detail?: string
  // True for alerts that themselves reveal something private (right now
  // only "a private document hasn't been uploaded yet") — Share mode
  // must hide these entirely, per the same rule ActionRow already
  // applies to the document action itself.
  isPrivate: boolean
}

function minutesBetween(now: Date, hh: number, mm: number): number {
  return hh * 60 + mm - (now.getHours() * 60 + now.getMinutes())
}

export interface GenerateAlertsInput {
  trip: Trip
  effectiveTrip: Trip
  now: Date // already timezone-adjusted — see lib/timezone.ts nowInZone
  presentDocKeys: Set<string>
}

export function generateAlerts({ trip, effectiveTrip, now, presentDocKeys }: GenerateAlertsInput): TripAlert[] {
  const alerts: TripAlert[] = []
  const phase = tripPhase(trip.meta.startDate, trip.meta.endDate, now)
  const today = effectiveTrip.days.find((d) => isSameISODate(d.date, now))

  // Leave soon / upcoming reservation, for today's next scheduled item.
  if (today) {
    const upcomingItems = today.scheduleItems.filter((item) => item.time)
    const next = upcomingItems.find((item) => {
      const [h, m] = item.time!.split(':').map(Number)
      return minutesBetween(now, h, m) >= 0
    })
    if (next) {
      const leaveBy = computeLeaveBy(next.time, next)
      if (leaveBy) {
        const [lh, lm] = leaveBy.leaveByTime.split(':').map(Number)
        const minsUntilLeave = minutesBetween(now, lh, lm)
        if (minsUntilLeave <= 30 && minsUntilLeave >= -10) {
          alerts.push({
            id: `leave:${next.id}`,
            type: 'leave-soon',
            priority: minsUntilLeave <= 15 ? 'critical' : 'important',
            group: 'now',
            title:
              minsUntilLeave > 0
                ? `Leave for ${next.label} in ${minsUntilLeave} min`
                : `Leave for ${next.label} now`,
            detail: `Leave by ${leaveBy.leaveByLabel}`,
            isPrivate: false,
          })
        }
      }
      const [nh, nm] = next.time!.split(':').map(Number)
      const minsUntilNext = minutesBetween(now, nh, nm)
      if (minsUntilNext >= 0 && minsUntilNext <= 120) {
        alerts.push({
          id: `upcoming:${next.id}`,
          type: 'upcoming',
          priority: 'info',
          group: 'today',
          title: `${next.label} · ${formatTime(next.time)}`,
          isPrivate: false,
        })
      }
    }

    // Travel day — any transport leg departing today.
    for (const t of effectiveTrip.transport) {
      if (t.date !== today.date || t.status === 'cancelled') continue
      alerts.push({
        id: `travel-day:${t.id}`,
        type: 'travel-day',
        priority: 'important',
        group: 'today',
        title: `${t.carrier ? `${t.carrier} ` : ''}${t.from} → ${t.to} today${t.departTime ? ` at ${formatTime(t.departTime)}` : ''}`,
        isPrivate: false,
      })
    }

    // Check-in / checkout — hotel bookings starting or ending today.
    for (const b of effectiveTrip.bookings) {
      if (b.category !== 'hotel' || b.status === 'cancelled') continue
      if (b.dateStart === today.date) {
        alerts.push({
          id: `checkin:${b.id}`,
          type: 'checkin',
          priority: 'info',
          group: 'today',
          title: `${b.name} check-in today${b.time ? ` from ${formatTime(b.time)}` : ''}`,
          isPrivate: false,
        })
      }
      if (b.dateEnd === today.date) {
        alerts.push({
          id: `checkout:${b.id}`,
          type: 'checkout',
          priority: 'important',
          group: 'today',
          title: `${b.name} checkout today`,
          isPrivate: false,
        })
      }
    }
  }

  // Missing documents — confirmed/paid items expecting a document that
  // hasn't been saved on this device yet, within the next couple of
  // days (far-future items would just be noise this early).
  for (const entry of buildWalletDocEntries(effectiveTrip)) {
    if (presentDocKeys.has(entry.privateDocumentKey)) continue
    const daysAway = daysUntil(entry.date, now)
    if (phase === 'active' && daysAway < -1) continue // already past, no longer actionable
    if (daysAway > 2) continue
    alerts.push({
      id: `missing-doc:${entry.privateDocumentKey}`,
      type: 'missing-document',
      priority: daysAway <= 0 ? 'important' : 'info',
      group: daysAway <= 0 ? 'today' : 'upcoming',
      title: `You still need your ${entry.title} document`,
      isPrivate: true,
    })
  }

  // Cancellation deadlines — existing Booking.cancellationDeadline data.
  for (const b of effectiveTrip.bookings) {
    if (!b.cancellationDeadline || b.status === 'cancelled') continue
    const deadline = new Date(b.cancellationDeadline)
    const hoursAway = (deadline.getTime() - now.getTime()) / 3_600_000
    if (hoursAway < 0 || hoursAway > 24 * 7) continue
    alerts.push({
      id: `cancel:${b.id}`,
      type: 'cancellation-deadline',
      priority: hoursAway <= 24 ? 'critical' : 'important',
      group: hoursAway <= 24 ? 'now' : today && b.dateStart === today.date ? 'today' : 'upcoming',
      title: `${b.name} cancellation deadline`,
      detail: deadline.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      isPrivate: false,
    })
  }

  // Trip readiness — unresolved high-priority OpenItems, pre-trip only.
  if (phase === 'pre') {
    for (const oi of effectiveTrip.openItems) {
      if (oi.status !== 'open' || oi.priority !== 'high') continue
      alerts.push({
        id: `readiness:${oi.id}`,
        type: 'readiness',
        priority: 'important',
        group: 'upcoming',
        title: oi.label,
        detail: oi.detail,
        isPrivate: false,
      })
    }
  }

  return alerts
}

const PRIORITY_RANK: Record<AlertPriority, number> = { critical: 0, important: 1, info: 2 }
const GROUP_RANK: Record<AlertGroup, number> = { now: 0, today: 1, upcoming: 2 }

export function sortAlerts(alerts: TripAlert[]): TripAlert[] {
  return [...alerts].sort((a, b) => {
    if (GROUP_RANK[a.group] !== GROUP_RANK[b.group]) return GROUP_RANK[a.group] - GROUP_RANK[b.group]
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  })
}

// Applies the traveler's own dismissed/snoozed state (see useAppStore
// alertOverrides) and, in Share mode, drops every isPrivate alert
// outright — never rendered, never counted toward the bell badge.
export function visibleAlerts(
  alerts: TripAlert[],
  tripId: string,
  overrides: Record<string, { dismissed?: boolean; snoozedUntil?: string }>,
  shareMode: boolean,
  now: Date
): TripAlert[] {
  return alerts.filter((a) => {
    if (shareMode && a.isPrivate) return false
    const override = overrides[`${tripId}:${a.id}`]
    if (!override) return true
    if (override.dismissed) return false
    if (override.snoozedUntil && new Date(override.snoozedUntil).getTime() > now.getTime()) return false
    return true
  })
}
