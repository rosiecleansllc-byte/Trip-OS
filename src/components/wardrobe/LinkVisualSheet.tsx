import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Trip, VisualBoard } from '../../types/trip'
import { sortVisualBoards, useVisualBoardImage, VISUAL_BOARD_TYPE_META } from '../../lib/visualBoards'
import { useAppStore } from '../../store/useAppStore'

function VisualBoardPickRow({ board, onSelect }: { board: VisualBoard; onSelect: () => void }) {
  const { url } = useVisualBoardImage(board.imageKey)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg-soft">
        {url && <img src={url} alt={board.title} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{board.title}</p>
        <p className="text-[11px] text-ink-soft">{VISUAL_BOARD_TYPE_META[board.type].label}</p>
      </div>
    </button>
  )
}

// Lets the traveler reuse one of her own already-uploaded VisualBoards
// (an outfit photo, a themed shoes/accessories flat-lay, …) as a
// wardrobe item's picture instead of re-uploading — see
// CapsuleItemImage's "Use existing visual" affordance, the only current
// call site. Selecting one calls onSelect(board.id); the caller is
// responsible for persisting it via useAppStore's linkWardrobeVisual.
// Portal-rendered to <body> for the same reason every other fullscreen
// sheet is — see index.css's .animate-fade-in comment.
export function LinkVisualSheet({
  trip,
  onSelect,
  onClose,
}: {
  trip: Trip
  onSelect: (visualBoardId: string) => void
  onClose: () => void
}) {
  const visualBoards = useAppStore((s) => s.visualBoards)
  const boards = sortVisualBoards(visualBoards.filter((b) => b.tripId === trip.meta.id))

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">Use existing visual</p>
            <button aria-label="Close" onClick={onClose} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          {boards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-bg-soft px-3 py-6 text-center text-xs text-ink-soft">
              No uploaded visuals yet for this trip. Add one from Pack's Visuals tab, or upload a dedicated photo
              for this item instead.
            </p>
          ) : (
            <div className="space-y-1.5">
              {boards.map((board) => (
                <VisualBoardPickRow key={board.id} board={board} onSelect={() => onSelect(board.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
