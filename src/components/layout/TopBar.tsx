import { Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { TripMeta } from '../../types/trip'
import { clsx } from 'clsx'

export function TopBar({ meta }: { meta: TripMeta }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const toggleShareMode = useAppStore((s) => s.toggleShareMode)

  return (
    <header
      className={clsx(
        'sticky top-0 z-20 border-b px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur transition-colors supports-[backdrop-filter]:bg-opacity-90',
        shareMode ? 'border-blue-dim/30 bg-blue-tint' : 'border-line bg-ivory/95'
      )}
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray">Trip OS</p>
          <h1 className="font-display text-lg leading-tight text-ink">{meta.name}</h1>
        </div>
        <button
          onClick={toggleShareMode}
          className={clsx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            shareMode
              ? 'border-blue bg-blue text-ivory'
              : 'border-line bg-paper text-ink-soft hover:border-blue-dim/40'
          )}
        >
          {shareMode ? <Eye size={14} /> : <EyeOff size={14} />}
          {shareMode ? 'Share mode' : 'Share'}
        </button>
      </div>
      {shareMode && (
        <p className="mx-auto mt-1.5 max-w-md text-[11px] text-blue">
          Private details are hidden — confirmation codes, costs, and personal notes.
        </p>
      )}
    </header>
  )
}
