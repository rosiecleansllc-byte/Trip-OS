import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import type { OutfitBoard, Trip, VisualBoard } from '../../types/trip'
import { Card } from '../ui/Card'
import { ImagePlaceholder } from '../ui/ImagePlaceholder'
import { Lightbox } from '../ui/Lightbox'
import { formatDateCompact } from '../../lib/date'
import { allOutfitBoardsInOrder, matchVisualBoardForItemName } from '../../lib/outfits'
import { useVisualBoardImage } from '../../lib/visualBoards'
import { useAppStore } from '../../store/useAppStore'

// One wardrobe item chip inside a look — resolves its own thumbnail from
// whatever the traveler has actually uploaded (matched by name against
// this trip's VisualBoards), so a look never fails to render just
// because one piece hasn't been photographed yet. No match yet → a
// plain placeholder chip with the item's name, same as any other
// not-uploaded-yet state elsewhere in Pack.
function ItemChip({ itemName, match, onOpen }: { itemName: string; match: VisualBoard | undefined; onOpen: (src: string, alt: string) => void }) {
  const { url } = useVisualBoardImage(match?.imageKey)
  if (url) {
    return (
      <button
        type="button"
        onClick={() => onOpen(url, itemName)}
        className="flex shrink-0 flex-col items-center gap-1"
      >
        <span className="block h-16 w-16 overflow-hidden rounded-xl bg-bg-soft">
          <img src={url} alt={itemName} className="h-full w-full object-cover" />
        </span>
        <span className="max-w-[68px] truncate text-[10px] text-ink-soft">{itemName}</span>
      </button>
    )
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-line bg-bg-soft">
        <ImageIcon size={16} className="text-ink-soft" />
      </span>
      <span className="max-w-[68px] truncate text-[10px] text-ink-soft">{itemName}</span>
    </div>
  )
}

// Exported so Today (single active day, possibly several looks) can
// render the exact same per-item-matched card without duplicating the
// matching/placeholder logic — see pages/Today.tsx.
export function OutfitBoardLookCard({
  board,
  dayLabel,
  tripVisualBoards,
  onOpen,
}: {
  board: OutfitBoard
  dayLabel: string
  tripVisualBoards: VisualBoard[]
  onOpen: (src: string, alt: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      {board.imageUrl && (
        <ImagePlaceholder
          label={board.label ?? dayLabel}
          imageUrl={board.imageUrl}
          className="h-56 w-full"
          onClick={() => onOpen(board.imageUrl!, board.label ?? dayLabel)}
        />
      )}
      <div className="p-4">
        <p className="text-xs font-medium text-gray">{dayLabel}</p>
        <p className="text-sm font-medium text-ink">{board.label ?? dayLabel}</p>
        <p className="mt-1 text-xs text-ink-soft">{board.note}</p>
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {board.itemNames.map((name) => (
            <ItemChip key={name} itemName={name} match={matchVisualBoardForItemName(tripVisualBoards, name)} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </Card>
  )
}

// The dynamic "Outfit Board" — every seeded look (see OutfitBoard),
// assembled at render time from whatever the traveler has already
// uploaded in IndexedDB. Never generates or stores a composite image;
// each item resolves its own photo (or a placeholder) independently, so
// one missing upload never takes down the rest of a look, and a day
// with several looks (e.g. Sept 9's Travel Day + Franklin's BBQ) shows
// every one of them rather than picking a single "the" outfit.
export function OutfitBoardSection({ trip }: { trip: Trip }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const shareMode = useAppStore((s) => s.shareMode)
  const visualBoards = useAppStore((s) => s.visualBoards)
  // Seeded look text/imageUrl (France's own composed photos) stays
  // visible in Share mode — see task 14 — but a traveler's own uploads
  // must never surface there, including as an item-chip match, so this
  // is the one place that zeroes them out for that mode rather than
  // trusting every downstream item-matching call site to check shareMode
  // itself.
  const tripVisualBoards = shareMode ? [] : visualBoards.filter((b) => b.tripId === trip.meta.id)
  const entries = allOutfitBoardsInOrder(trip)

  if (entries.length === 0) return null

  return (
    <div className="space-y-4">
      {entries.map(({ day, board }) => (
        <OutfitBoardLookCard
          key={board.id}
          board={board}
          dayLabel={`Day ${day.dayNumber} · ${formatDateCompact(day.date)} · ${day.title}`}
          tripVisualBoards={tripVisualBoards}
          onOpen={(src, alt) => setLightbox({ src, alt })}
        />
      ))}
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
