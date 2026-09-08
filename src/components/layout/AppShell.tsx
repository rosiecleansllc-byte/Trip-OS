import type { PropsWithChildren } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'
import { UpdateBanner } from './UpdateBanner'
import { AddItemFab } from '../manual/AddItemFab'
import { AddItemSheet } from '../manual/AddItemSheet'
import { AlertCenter } from '../alerts/AlertCenter'
import { OutfitDetailSheet } from '../wardrobe/OutfitDetailSheet'
import { AddOutfitSheet } from '../wardrobe/AddOutfitSheet'
import { useAutoLinkWardrobeVisuals } from '../wardrobe/useAutoLinkWardrobeVisuals'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { getEffectiveTrip } from '../../lib/manualItems'
import { getTripTimeZone, nowInZone } from '../../lib/timezone'
import { useNow } from '../../lib/useNow'
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
  // realNow ticks (lib/useNow.ts) so the badge count and Alert Center
  // stay live without navigating away; `now` is derived from it as the
  // destination-local wall clock for itinerary-time alert logic.
  const realNow = useNow()
  const now = nowInZone(getTripTimeZone(trip), realNow)
  const { alerts } = useTripAlerts(trip, effectiveTrip, now, realNow)
  // Reconciles wardrobe items against already-uploaded VisualBoards once
  // per item (see lib/wardrobeOutfits.ts + useAutoLinkWardrobeVisuals) —
  // mounted here, not per-page, so every surface that shows a wardrobe
  // item's photo (Outfit Board, Trip, Today) sees the same resolved links.
  useAutoLinkWardrobeVisuals(trip)

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
          <AddOutfitSheet trip={trip} />
        </>
      )}
      {/* Mounted globally (not just on Pack) so Trip.tsx — and any other
          page — can open a specific outfit's detail via
          useOutfitDetailUiStore without navigating to Pack first. */}
      <OutfitDetailSheet trip={trip} />
      <AlertCenter trip={trip} effectiveTrip={effectiveTrip} now={now} realNow={realNow} />
      <UpdateBanner />
      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}
