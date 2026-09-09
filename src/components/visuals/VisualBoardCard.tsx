import { useEffect, useRef, useState } from 'react'
import { ImageIcon, MoreHorizontal, Upload } from 'lucide-react'
import type { Trip, VisualBoard } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useVisualBoardUiStore } from '../../store/useVisualBoardUiStore'
import {
  deleteVisualBoardImage,
  isWardrobeItemBoard,
  putVisualBoardImage,
  useVisualBoardImage,
  VISUAL_BOARD_TYPE_META,
} from '../../lib/visualBoards'
import { WARDROBE_CATEGORY_LABELS } from '../../lib/wardrobeOutfits'
import { Lightbox } from '../ui/Lightbox'

// One traveler-uploaded visual board, rendered as a card in Pack's grid.
// Owns the full View / Replace / Edit / Delete lifecycle for a board —
// Today/Trip only ever get a read-only thumbnail that opens a Lightbox, no
// management controls, so this is the single place a board can be changed
// or removed, same as ManualItemMenu is the single source of truth for
// manual trip items even though those also render elsewhere.
export function VisualBoardCard({
  board,
  trip,
  aspect = 'square',
  className = '',
}: {
  board: VisualBoard
  trip: Trip
  aspect?: 'square' | 'wide'
  className?: string
}) {
  const [version, setVersion] = useState(0)
  const { url } = useVisualBoardImage(board.imageKey, version)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Set when a Replace/Delete IndexedDB write actually failed — surfaced
  // to the traveler rather than swallowed, since silently treating either
  // as "done" would either show a stale image (Replace) or delete the
  // board metadata while its image Blob is still sitting in IndexedDB
  // with nothing left pointing at it (Delete) — an orphan with no way
  // back into the UI, because imageKey only ever lived on this board.
  const [actionError, setActionError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const deleteVisualBoard = useAppStore((s) => s.deleteVisualBoard)
  const openEdit = useVisualBoardUiStore((s) => s.openEdit)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const dayLabel = board.dayId ? trip.days.find((d) => d.id === board.dayId) : undefined
  const isWardrobeItem = isWardrobeItemBoard(board)
  // Subtitle: a day-assigned board still leads with its day; a wardrobe
  // item shows its category (+ subtype, if given) instead of the
  // otherwise-unused board `type`; anything else falls back to its
  // board type label, same as before this component knew about
  // wardrobe items at all.
  const subtitle = dayLabel
    ? `Day ${dayLabel.dayNumber} · ${dayLabel.title}`
    : isWardrobeItem
      ? [WARDROBE_CATEGORY_LABELS[board.wardrobeCategory ?? 'other'], board.wardrobeSubtype].filter(Boolean).join(' · ')
      : VISUAL_BOARD_TYPE_META[board.type].label
  const badgeLabel = isWardrobeItem ? WARDROBE_CATEGORY_LABELS[board.wardrobeCategory ?? 'other'] : 'Board'

  const handleReplace = async (file: File) => {
    setActionError(null)
    try {
      await putVisualBoardImage(board.imageKey, file)
      setVersion((v) => v + 1)
    } catch {
      // The IndexedDB write failed, so the previous image blob is still
      // intact under this key (a failed put never partially overwrites
      // it) — no need to bump version, just tell the traveler the
      // replace didn't take instead of quietly leaving the old photo
      // showing as if nothing went wrong.
      setActionError("Couldn't replace the image — the previous one is still saved. Try again.")
    }
    setMenuOpen(false)
    setConfirmingDelete(false)
  }

  // Removes only the image, keeping the board (title/day/notes) intact —
  // distinct from Delete below, which removes the whole board. Lets a
  // board go back to the imageless "Add image" state without losing
  // anything the traveler already typed in.
  const handleRemoveImage = async () => {
    setActionError(null)
    try {
      await deleteVisualBoardImage(board.imageKey)
      setVersion((v) => v + 1)
    } catch {
      setActionError("Couldn't remove the image. Try again.")
    }
    setMenuOpen(false)
    setConfirmingDelete(false)
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await deleteVisualBoardImage(board.imageKey)
    } catch {
      // Deleting the board's metadata now would orphan its image blob in
      // IndexedDB permanently — imageKey only ever lives on this board,
      // so once the metadata is gone there is no remaining way for the
      // UI to find and clean up that blob. Keep the board (and the
      // retry path through its own menu) instead of pretending the
      // delete succeeded.
      setActionError("Couldn't delete the image, so this board wasn't removed. Try again.")
      setMenuOpen(false)
      setConfirmingDelete(false)
      return
    }
    deleteVisualBoard(board.id)
    setMenuOpen(false)
    setConfirmingDelete(false)
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleReplace(file)
        }}
      />

      <button
        type="button"
        onClick={() => (url ? setLightboxOpen(true) : inputRef.current?.click())}
        className={`flex w-full flex-col items-center justify-center gap-1.5 bg-bg-soft ${aspect === 'wide' ? 'aspect-video' : 'aspect-square'}`}
      >
        {url ? (
          <img src={url} alt={board.title} className="h-full w-full object-contain" />
        ) : (
          <>
            <ImageIcon size={22} className="text-ink-soft" />
            <span className="text-[11px] font-medium text-blue">Add image</span>
          </>
        )}
      </button>

      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-ink/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
        {badgeLabel}
      </span>

      <div className="p-2.5">
        <p className="truncate text-xs font-medium text-ink">{board.title}</p>
        {subtitle && <p className="truncate text-[11px] text-ink-soft">{subtitle}</p>}
        {actionError && <p className="mt-1 text-[10px] text-red">{actionError}</p>}
      </div>

      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => {
            setMenuOpen((v) => !v)
            setConfirmingDelete(false)
          }}
          aria-label="More options"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-soft backdrop-blur-sm transition-colors hover:border-blue/40"
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {confirmingDelete ? (
              <div className="p-2.5">
                <p className="text-xs text-ink">{isWardrobeItem ? 'Delete this item?' : 'Delete this board?'}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 rounded-full border border-line py-1 text-xs font-medium text-ink-soft"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 rounded-full bg-red py-1 text-xs font-medium text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                {url && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setLightboxOpen(true)
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-bg-soft"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    inputRef.current?.click()
                  }}
                  className="flex w-full items-center gap-1 border-t border-line px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
                >
                  <Upload size={11} />
                  {url ? 'Replace image' : 'Add image'}
                </button>
                {url && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveImage()}
                    className="block w-full border-t border-line px-3 py-2 text-left text-xs font-medium text-ink-soft hover:bg-bg-soft"
                  >
                    Remove image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    openEdit(board)
                  }}
                  className="block w-full border-t border-line px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="block w-full border-t border-line px-3 py-2 text-left text-xs font-medium text-red hover:bg-bg-soft"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {lightboxOpen && url && <Lightbox src={url} alt={board.title} onClose={() => setLightboxOpen(false)} />}
    </div>
  )
}
