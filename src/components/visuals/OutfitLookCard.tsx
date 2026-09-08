import { useEffect, useRef, useState } from 'react'
import { ImageIcon, MoreHorizontal } from 'lucide-react'
import type { OutfitLook, Trip, VisualBoard } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useOutfitLookUiStore } from '../../store/useOutfitLookUiStore'
import { useVisualBoardImage } from '../../lib/visualBoards'
import { Lightbox } from '../ui/Lightbox'

function LookThumb({ board, onOpen }: { board: VisualBoard; onOpen: (url: string) => void }) {
  const { url } = useVisualBoardImage(board.imageKey)
  return (
    <button
      type="button"
      onClick={() => url && onOpen(url)}
      disabled={!url}
      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg-soft"
    >
      {url ? <img src={url} alt={board.title} className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-ink-soft" />}
    </button>
  )
}

// One traveler-composed OutfitLook, rendered in Pack's Outfit Board
// section. A look never owns image data itself — it's purely a
// title/day/notes plus an ordered list of existing VisualBoard ids, so
// this component's own state is just UI chrome (the ••• menu, the
// lightbox), with no upload/replace logic of its own — that all still
// lives on VisualBoardCard, the one place a photo is actually managed.
export function OutfitLookCard({ look, trip }: { look: OutfitLook; trip: Trip }) {
  const visualBoards = useAppStore((s) => s.visualBoards)
  const deleteOutfitLook = useAppStore((s) => s.deleteOutfitLook)
  const openEdit = useOutfitLookUiStore((s) => s.openEdit)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const day = look.dayId ? trip.days.find((d) => d.id === look.dayId) : undefined
  const boards = look.visualBoardIds
    .map((id) => visualBoards.find((b) => b.id === id))
    .filter((b): b is VisualBoard => Boolean(b))

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{look.title}</p>
          <p className="truncate text-[11px] text-ink-soft">
            {day ? `Day ${day.dayNumber} · ${day.title}` : 'Whole trip'}
          </p>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v)
              setConfirmingDelete(false)
            }}
            aria-label="More options"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-soft"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {confirmingDelete ? (
                <div className="p-2.5">
                  <p className="text-xs text-ink">Delete this look?</p>
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
                      onClick={() => {
                        deleteOutfitLook(look.id)
                        setMenuOpen(false)
                        setConfirmingDelete(false)
                      }}
                      className="flex-1 rounded-full bg-red py-1 text-xs font-medium text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      openEdit(look)
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
                  >
                    Edit look
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
      </div>

      {look.notes && <p className="mt-1.5 text-xs text-ink-soft">{look.notes}</p>}

      {boards.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {boards.map((b) => (
            <LookThumb key={b.id} board={b} onOpen={setLightboxSrc} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-soft">No photos linked yet — edit this look to add some.</p>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} alt={look.title} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
