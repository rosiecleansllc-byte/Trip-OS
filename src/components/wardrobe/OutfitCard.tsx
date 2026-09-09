import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Outfit, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useOutfitUiStore } from '../../store/useOutfitUiStore'
import { resolveOutfitItems, outfitDayLabel } from '../../lib/wardrobeOutfits'
import { WardrobeItemThumb } from './WardrobeItemThumb'

// Compact card for one Outfit — used in Pack's outfit list and reused
// wherever a trip day previews its assigned outfit(s). Tapping the card
// body opens the shared OutfitDetailSheet (via onOpen, provided by the
// caller so both Pack and Trip can wire it to the same global
// useOutfitDetailUiStore). The ••• menu (edit/delete) only ever renders
// for a traveler-created outfit — seeded ones (editable=false) are
// read-only here, same as OutfitBoard always was.
export function OutfitCard({
  outfit,
  trip,
  editable,
  onOpen,
}: {
  outfit: Outfit
  trip: Trip
  editable: boolean
  onOpen: () => void
}) {
  const shareMode = useAppStore((s) => s.shareMode)
  const deleteOutfit = useAppStore((s) => s.deleteOutfit)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const openEdit = useOutfitUiStore((s) => s.openEdit)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
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

  // Uploaded wardrobe-item pieces are excluded entirely in Share mode
  // (same "zero the array" pattern as every other private-upload
  // surface) — a seeded piece's name still shows either way.
  const items = resolveOutfitItems(trip, outfit, shareMode ? [] : visualBoards, wardrobeItemOverrides)
  const dayLabel = outfitDayLabel(trip, outfit.dayId) ?? 'Whole trip'

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-3.5">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2 pr-7">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{outfit.name}</p>
            <p className="truncate text-[11px] text-ink-soft">{dayLabel}</p>
          </div>
        </div>
        {outfit.notes && <p className="mt-1.5 text-xs text-ink-soft">{outfit.notes}</p>}
        {items.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {items.map((item) => (
              // No onOpen here — thumbnails are just a preview inside the
              // card's own tap target (opens the detail sheet); a nested
              // per-item lightbox button would make this an invalid
              // button-inside-button. Tap-to-zoom on a specific item
              // lives in OutfitDetailSheet instead.
              <WardrobeItemThumb key={item.id} item={item} trip={trip} shareMode={shareMode} size={56} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-soft">No wardrobe items yet.</p>
        )}
      </button>

      {editable && (
        <div ref={menuRef} className="absolute right-3 top-3">
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
                  <p className="text-xs text-ink">Delete this outfit?</p>
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
                        deleteOutfit(outfit.id)
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
                      openEdit(outfit)
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
                  >
                    Edit outfit
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
      )}
    </div>
  )
}
