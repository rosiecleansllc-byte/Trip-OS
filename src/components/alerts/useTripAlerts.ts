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
export function useTripAlerts(trip: Trip, effectiveTrip: Trip, now: Date): { alerts: TripAlert[] } {
  const shareMode = useAppStore((s) => s.shareMode)
  const alertOverrides = useAppStore((s) => s.alertOverrides)
  const { keys: presentDocKeys } = usePrivateDocKeySet()

  const raw = useMemo(
    () => generateAlerts({ trip, effectiveTrip, now, presentDocKeys }),
    // now changes every render by construction (nowInZone), which is
    // fine — alert generation is cheap and meant to reflect "right now".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip, effectiveTrip, presentDocKeys]
  )

  const alerts = useMemo(
    () => sortAlerts(visibleAlerts(raw, trip.meta.id, alertOverrides, shareMode, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, trip.meta.id, alertOverrides, shareMode]
  )

  return { alerts }
}
