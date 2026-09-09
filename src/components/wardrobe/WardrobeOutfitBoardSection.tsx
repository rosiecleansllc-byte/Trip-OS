import { useState } from 'react'
import type { Trip } from '../../types/trip'
import { Card } from '../ui/Card'
import { Lightbox } from '../ui/Lightbox'
import { formatDateCompact } from '../../lib/date'
import { allSeededOutfitsInOrder, resolveOutfitItems } from '../../lib/wardrobeOutfits'
import { useOutfitDetailUiStore } from '../../store/useOutfitDetailUiStore'
import { useAppStore } from '../../store/useAppStore'
import { WardrobeItemThumb } from './WardrobeItemThumb'

// The visual "Outfit Board" for trips on the new reference-based Outfit
// system (Austin's six looks) — analogous to France's older
// OutfitBoardSection, but built from real wardrobe-item references
// instead of fuzzy itemNames-to-photo-title matching. Every item's
// image resolves through WardrobeItemThumb, which reads the exact same
// IndexedDB key CapsuleItemImage writes to in the Wardrobe tab — so a
// piece photographed once there shows up here with no re-upload, and a
// piece never photographed degrades to a graceful placeholder without
// breaking the rest of the look. Returns null for any trip (e.g.
// France) that has no seeded Outfits — OutfitBoardSection keeps
// covering those unchanged.
export function WardrobeOutfitBoardSection({ trip, shareMode }: { trip: Trip; shareMode: boolean }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const openDetail = useOutfitDetailUiStore((s) => s.open)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const entries = allSeededOutfitsInOrder(trip)

  if (entries.length === 0) return null

  return (
    <div className="space-y-4">
      {entries.map(({ day, outfit }) => {
        // Uploaded wardrobe-item pieces are excluded entirely in Share
        // mode (same "zero the array" pattern as every other
        // private-upload surface) — a seeded piece's name still shows
        // either way.
        const items = resolveOutfitItems(trip, outfit, shareMode ? [] : visualBoards)
        const dayLabel = `Day ${day.dayNumber} · ${formatDateCompact(day.date)} · ${day.title}`
        return (
          <Card key={outfit.id} className="p-4">
            <button type="button" onClick={() => openDetail(outfit.id)} className="block w-full text-left">
              <p className="text-xs font-medium text-gray">{dayLabel}</p>
              <p className="text-sm font-medium text-ink">{outfit.name}</p>
              {outfit.notes && <p className="mt-1 text-xs text-ink-soft">{outfit.notes}</p>}
            </button>
            <div className="mt-3 flex flex-wrap gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-1">
                  <WardrobeItemThumb
                    item={item}
                    trip={trip}
                    shareMode={shareMode}
                    size={72}
                    onOpen={(src, alt) => setLightbox({ src, alt })}
                  />
                  <span className="max-w-[76px] truncate text-center text-[10px] text-ink-soft">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
