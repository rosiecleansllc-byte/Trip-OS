import { ImageIcon } from 'lucide-react'
import type { CapsuleItem, Trip } from '../../types/trip'
import { useVisualBoardImage } from '../../lib/visualBoards'
import { resolveLinkedVisualBoard, wardrobeItemImageKey } from '../../lib/wardrobeOutfits'
import { useAppStore } from '../../store/useAppStore'

// Read-only image resolver for a wardrobe item, used anywhere an Outfit
// shows its component pieces (Outfit Board, Outfit detail, Trip/Today
// preview) — never offers Add/Replace/Remove/Link itself, that
// management stays exclusively in the Wardrobe tab's CapsuleItemImage.
// Resolves, in order:
//   1. the item's seeded public photo (item.imageUrl) — always shown,
//      safe in Share mode;
//   2. unless shareMode is true, a dedicated private photo the
//      traveler uploaded for this exact item (the same per-item
//      IndexedDB key CapsuleItemImage writes to) — so a photo uploaded
//      once in Wardrobe shows up everywhere an outfit references that
//      item, no separate re-upload needed;
//   3. unless shareMode is true, an existing VisualBoard the traveler
//      already uploaded and linked to this item (explicitly via "Use
//      existing visual", or automatically — see
//      useAutoLinkWardrobeVisuals) — so a whole-outfit or themed
//      flat-lay photo she uploaded before this item even existed still
//      backs it, with zero re-upload and zero duplicated blobs;
//   4. a placeholder.
// A dedicated photo (tier 2) always wins over a linked one (tier 3) —
// see CapsuleItemImage, where uploading a dedicated photo overrides the
// link and removing it falls back to the link again.
// shareMode is a required prop (not read from the store) so every
// caller has to make the privacy call explicit rather than risk
// forgetting it. The linked-visual tier only ever reads the persisted
// link (useAppStore's wardrobeVisualLinks) — see
// useAutoLinkWardrobeVisuals for where that link is computed and
// written; this component never computes a live match itself.
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
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeVisualLinks = useAppStore((s) => s.wardrobeVisualLinks)

  const privateKey = !item.imageUrl && !shareMode ? wardrobeItemImageKey(trip, item) : undefined
  const { url: privateUrl } = useVisualBoardImage(privateKey)

  const linkedBoard =
    !item.imageUrl && !shareMode ? resolveLinkedVisualBoard(trip, item, visualBoards, wardrobeVisualLinks) : undefined
  const { url: linkedUrl } = useVisualBoardImage(linkedBoard?.imageKey)

  const url = item.imageUrl ?? privateUrl ?? linkedUrl

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
