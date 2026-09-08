import { useEffect, useRef, useState } from 'react'
import { ImageIcon, MoreHorizontal, Upload } from 'lucide-react'
import type { Trip, VisualBoard } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useVisualBoardUiStore } from '../../store/useVisualBoardUiStore'
import { deleteVisualBoardImage, putVisualBoardImage, useVisualBoardImage, VISUAL_BOARD_TYPE_META } from '../../lib/visualBoards'
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

  const handleReplace = async (file: File) => {
    await putVisualBoardImage(board.imageKey, file).catch(() => {})
    setVersion((v) => v + 1)
    setMenuOpen(false)
    setConfirmingDelete(false)
  }

  const handleDelete = async () => {
    await deleteVisualBoardImage(board.imageKey).catch(() => {})
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
        onClick={() => url && setLightboxOpen(true)}
        disabled={!url}
        className={`flex w-full items-center justify-center bg-bg-soft ${aspect === 'wide' ? 'aspect-video' : 'aspect-square'}`}
      >
        {url ? (
          <img src={url} alt={board.title} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon size={22} className="text-ink-soft" />
        )}
      </button>

      <div className="p-2.5">
        <p className="truncate text-xs font-medium text-ink">{board.title}</p>
        <p className="truncate text-[11px] text-ink-soft">
          {dayLabel ? `Day ${dayLabel.dayNumber} · ${dayLabel.title}` : VISUAL_BOARD_TYPE_META[board.type].label}
        </p>
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
                <p className="text-xs text-ink">Delete this board?</p>
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
                  Replace image
                </button>
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
