import { ImageIcon } from 'lucide-react'
import type { CapsuleItem, Trip } from '../../types/trip'
import { useVisualBoardImage } from '../../lib/visualBoards'
import { wardrobeItemImageKey } from '../../lib/wardrobeOutfits'

// Read-only image resolver for a wardrobe item, used anywhere an Outfit
// shows its component pieces (Outfit Board, Outfit detail, Trip
// preview) — never offers Add/Replace/Remove itself, that management
// stays exclusively in the Wardrobe tab's CapsuleItemImage. Resolves,
// in order: the item's seeded public photo (item.imageUrl, always
// shown, safe in Share mode); otherwise, unless shareMode is true, the
// same private per-item IndexedDB key CapsuleItemImage already writes
// to — so a photo uploaded once in Wardrobe shows up everywhere an
// outfit references that item, no separate re-upload ever needed.
// shareMode is a required prop (not read from the store) so every
// caller has to make the privacy call explicit rather than risk
// forgetting it.
export function WardrobeItemThumb({
  item,
  trip,
  shareMode,
  size = 64,
  onOpen,
}: {
  item: CapsuleItem
  trip: Trip
  shareMode: boolean
  size?: number
  onOpen?: (src: string, alt: string) => void
}) {
  const privateKey = !item.imageUrl && !shareMode ? wardrobeItemImageKey(trip, item) : undefined
  const { url: privateUrl } = useVisualBoardImage(privateKey)
  const url = item.imageUrl ?? privateUrl

  if (url && onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(url, item.name)}
        className="shrink-0 overflow-hidden rounded-xl bg-bg-soft"
        style={{ width: size, height: size }}
      >
        <img src={url} alt={item.name} className="h-full w-full object-cover" />
      </button>
    )
  }

  // No onOpen — used as a plain preview (e.g. nested inside another
  // tappable card), so this must never itself be a <button>: a caller
  // that's already a button around this thumbnail would otherwise end
  // up with an invalid button-inside-button.
  if (url) {
    return (
      <div className="shrink-0 overflow-hidden rounded-xl bg-bg-soft" style={{ width: size, height: size }}>
        <img src={url} alt={item.name} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-line bg-bg-soft"
      style={{ width: size, height: size }}
    >
      <ImageIcon size={Math.round(size * 0.28)} className="text-ink-soft" />
    </div>
  )
}
