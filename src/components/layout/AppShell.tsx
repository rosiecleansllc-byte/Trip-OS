import type { PropsWithChildren } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { AddItemFab } from '../manual/AddItemFab'
import { AddItemSheet } from '../manual/AddItemSheet'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'

export function AppShell({
  trip,
  pendingCount,
  children,
}: PropsWithChildren<{ trip: Trip; pendingCount?: number }>) {
  const shareMode = useAppStore((s) => s.shareMode)

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <TopBar meta={trip.meta} />
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
      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}
