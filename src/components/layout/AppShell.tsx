import type { PropsWithChildren } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'
import { UpdateBanner } from './UpdateBanner'
import { AddItemFab } from '../manual/AddItemFab'
import { AddItemSheet } from '../manual/AddItemSheet'
import { AlertCenter } from '../alerts/AlertCenter'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { getEffectiveTrip } from '../../lib/manualItems'
import { getTripTimeZone, nowInZone } from '../../lib/timezone'
import { useTripAlerts } from '../alerts/useTripAlerts'

export function AppShell({
  trip,
  pendingCount,
  children,
}: PropsWithChildren<{ trip: Trip; pendingCount?: number }>) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const now = nowInZone(getTripTimeZone(trip))
  const { alerts } = useTripAlerts(trip, effectiveTrip, now)

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <TopBar meta={trip.meta} alertBadgeCount={alerts.length} />
        <OfflineBanner />
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      </div>
      {/* Manual add/edit is a Cecilia-only authoring tool — hidden in Share
          mode along with every other private/edit control in the app. */}
      {!shareMode && (
        <>
          <AddItemFab />
          <AddItemSheet trip={trip} />
        </>
      )}
      <AlertCenter trip={trip} effectiveTrip={effectiveTrip} now={now} />
      <UpdateBanner />
      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}
