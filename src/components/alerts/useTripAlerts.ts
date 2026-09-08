import { useMemo } from 'react'
import type { Trip } from '../../types/trip'
import { generateAlerts, sortAlerts, visibleAlerts, type TripAlert } from '../../lib/alerts'
import { usePrivateDocKeySet } from '../../lib/walletDocs'
import { useAppStore } from '../../store/useAppStore'

// The single place that combines alert generation (lib/alerts.ts, pure
// trip data) with the traveler's own dismiss/snooze overrides and Share
// mode — every alert-consuming surface (the bell badge, Alert Center,
// Today's banner) calls this instead of assembling the pieces itself,
// so they can never disagree about which alerts are currently visible.
//
// `now` is the destination-local wall clock (lib/timezone.ts nowInZone)
// for itinerary logic; `realNow` is the actual current instant, for
// comparing against real timestamps (cancellation deadlines, snooze
// expiry) — see the GenerateAlertsInput/visibleAlerts comments in
// lib/alerts.ts for why the two must never be conflated. Both are
// listed as useMemo deps rather than suppressed: callers are expected to
// pass values from useNow() (or equivalent) that actually change over
// time, so alerts correctly recompute as time passes rather than only
// on an unrelated re-render.
export function useTripAlerts(trip: Trip, effectiveTrip: Trip, now: Date, realNow: Date): { alerts: TripAlert[] } {
  const shareMode = useAppStore((s) => s.shareMode)
  const alertOverrides = useAppStore((s) => s.alertOverrides)
  const { keys: presentDocKeys } = usePrivateDocKeySet()

  const raw = useMemo(
    () => generateAlerts({ trip, effectiveTrip, now, realNow, presentDocKeys }),
    [trip, effectiveTrip, now, realNow, presentDocKeys]
  )

  const alerts = useMemo(
    () => sortAlerts(visibleAlerts(raw, trip.meta.id, alertOverrides, shareMode, realNow)),
    [raw, trip.meta.id, alertOverrides, shareMode, realNow]
  )

  return { alerts }
}
