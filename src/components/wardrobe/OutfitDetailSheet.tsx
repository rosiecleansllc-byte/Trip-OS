import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2, X } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useOutfitDetailUiStore } from '../../store/useOutfitDetailUiStore'
import { useOutfitUiStore } from '../../store/useOutfitUiStore'
import { resolveOutfitItems, outfitDayLabel } from '../../lib/wardrobeOutfits'
import { WardrobeItemThumb } from './WardrobeItemThumb'
import { Lightbox } from '../ui/Lightbox'

// The one true "outfit detail" view — mounted once in AppShell (see
// AppShell.tsx), driven by useOutfitDetailUiStore, so any page
// (Trip.tsx especially) can open a *specific* outfit's detail with
// open(outfitId) without navigating to Pack first. Portal-rendered to
// <body> for the same reason AddVisualBoardSheet/AddOutfitSheet
// are: a "fixed inset-0" sheet nested inside a page's own
// .animate-fade-in wrapper gets trapped in that ancestor's containing
// block/stacking context instead of covering the viewport.
export function OutfitDetailSheet({ trip }: { trip: Trip }) {
  const openOutfitId = useOutfitDetailUiStore((s) => s.openOutfitId)
  const close = useOutfitDetailUiStore((s) => s.close)
  const shareMode = useAppStore((s) => s.shareMode)
  const storeOutfits = useAppStore((s) => s.outfits)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const deleteOutfit = useAppStore((s) => s.deleteOutfit)
  const openEdit = useOutfitUiStore((s) => s.openEdit)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  if (!openOutfitId) return null

  const seededOutfit = trip.outfits?.find((o) => o.id === openOutfitId)
  const customOutfit = storeOutfits.find((o) => o.id === openOutfitId && o.tripId === trip.meta.id)
  const outfit = seededOutfit ?? customOutfit
  // The outfit belongs to a different trip than the one currently
  // active, or was deleted out from under an open detail view — close
  // rather than render nothing silently.
  if (!outfit) {
    close()
    return null
  }

  const editable = Boolean(customOutfit) && !shareMode
  // Uploaded wardrobe-item pieces are excluded entirely in Share mode
  // (same "zero the array" pattern as every other private-upload
  // surface) — a seeded piece's name still shows either way.
  const items = resolveOutfitItems(trip, outfit, shareMode ? [] : visualBoards)
  const dayLabel = outfitDayLabel(trip, outfit.dayId) ?? 'Whole trip'

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-lg text-ink">{outfit.name}</p>
              <p className="text-xs text-ink-soft">{dayLabel}</p>
            </div>
            <button aria-label="Close" onClick={close} className="mt-0.5 shrink-0 text-ink-soft">
              <X size={18} />
            </button>
          </div>

          {outfit.notes && <p className="mt-2 text-sm text-ink-soft">{outfit.notes}</p>}

          <div className="mt-4 grid grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <WardrobeItemThumb
                  item={item}
                  trip={trip}
                  shareMode={shareMode}
                  size={96}
                  onOpen={(src, alt) => setLightbox({ src, alt })}
                />
                <span className="text-center text-[11px] text-ink-soft">{item.name}</span>
              </div>
            ))}
          </div>

          {editable && (
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  close()
                  openEdit(outfit)
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOutfit(outfit.id)
                  close()
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red/30 bg-red-tint py-2.5 text-sm font-medium text-red"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>,
    document.body
  )
}
