import { Eye, EyeOff, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import type { TripMeta } from '../../types/trip'
import { clsx } from 'clsx'
import { AlertBell } from '../alerts/AlertBell'

export function TopBar({ meta, alertBadgeCount = 0 }: { meta: TripMeta; alertBadgeCount?: number }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const toggleShareMode = useAppStore((s) => s.toggleShareMode)

  return (
    <header
      className={clsx(
        'sticky top-0 z-20 shrink-0 border-b px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur transition-colors supports-[backdrop-filter]:bg-opacity-90',
        shareMode ? 'border-blue/30 bg-blue-tint' : 'border-line bg-bg/95'
      )}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft">
            <LayoutGrid size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">Trip OS</p>
            <h1 className="truncate font-display text-lg leading-tight text-ink">{meta.name}</h1>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <AlertBell count={alertBadgeCount} />
          {!meta.sharedLinkId && <button
            onClick={toggleShareMode}
            className={clsx(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              shareMode
                ? 'border-blue bg-blue text-white'
                : 'border-line bg-surface text-ink-soft hover:border-blue/40'
            )}
          >
            {shareMode ? <Eye size={14} /> : <EyeOff size={14} />}
            {shareMode ? 'Private hidden' : 'Hide private'}
          </button>}
        </div>
      </div>
      {shareMode && (
        <p className="mx-auto mt-1.5 max-w-md text-[11px] text-blue">
          {meta.sharedLinkId ? 'Shared itinerary · Read-only. Access is controlled by the owner.' : 'Private details are hidden on this device. To send this itinerary, use Share trip on the trip overview.'}
        </p>
      )}
    </header>
  )
}
