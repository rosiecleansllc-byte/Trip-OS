import type { PropsWithChildren } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import type { TripMeta } from '../../types/trip'

export function AppShell({ meta, children }: PropsWithChildren<{ meta: TripMeta }>) {
  return (
    <div className="min-h-dvh bg-ivory">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <TopBar meta={meta} />
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
