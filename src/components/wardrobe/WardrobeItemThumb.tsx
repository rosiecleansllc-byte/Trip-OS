import { ImageIcon } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { useVisualBoardImage } from '../../lib/visualBoards'
import { resolveLinkedVisualBoard, wardrobeItemImageKey, type ResolvedWardrobeItem } from '../../lib/wardrobeOutfits'
import { useAppStore } from '../../store/useAppStore'

// Read-only image resolver for a wardrobe item, used anywhere an Outfit
// shows its component pieces (Outfit Board, Outfit detail, Trip/Today
// preview) — never offers Add/Replace/Remove/Link itself, that
// management stays exclusively in the Wardrobe tab (CapsuleItemImage for
// a seeded piece, VisualBoardCard for a traveler-uploaded one). Accepts
// a ResolvedWardrobeItem (see lib/wardrobeOutfits.ts) rather than a raw
// CapsuleItem, since an Outfit's pieces can come from either id space —
// a seeded CapsuleItem or a traveler-uploaded wardrobe-item VisualBoard.
//
// Resolution branches on item.source:
//   - 'uploaded': the piece already IS a VisualBoard, so its own
//     imageKey is read directly (unless shareMode is true) — no linking
//     indirection needed, it never had a separate "dedicated photo" to
//     begin with.
//   - 'capsule': the original seeded-item chain, in order — the item's
//     seeded public photo (item.imageUrl, always shown, safe in Share
//     mode); unless shareMode is true, a dedicated private photo the
//     traveler uploaded for this exact item (same per-item IndexedDB key
//     CapsuleItemImage writes to); unless shareMode is true, an existing
//     VisualBoard linked to this item (explicitly via "Use existing
//     visual", or automatically — see useAutoLinkWardrobeVisuals). A
//     dedicated photo always wins over a linked one — see
//     CapsuleItemImage, where uploading one overrides the link and
//     removing it falls back to the link again.
// Either branch falls through to a placeholder.
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
  item: ResolvedWardrobeItem
  trip: Trip
  shareMode: boolean
  size?: number
  onOpen?: (src: string, alt: string) => void
}) {
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeVisualLinks = useAppStore((s) => s.wardrobeVisualLinks)

  const isCapsule = item.source === 'capsule'

  const uploadedKey = !isCapsule && !shareMode ? item.imageKey : undefined
  const { url: uploadedUrl } = useVisualBoardImage(uploadedKey)

  const privateKey = isCapsule && !item.imageUrl && !shareMode ? wardrobeItemImageKey(trip, item.id) : undefined
  const { url: privateUrl } = useVisualBoardImage(privateKey)

  const linkedBoard =
    isCapsule && !item.imageUrl && !shareMode
      ? resolveLinkedVisualBoard(trip, item.id, visualBoards, wardrobeVisualLinks)
      : undefined
  const { url: linkedUrl } = useVisualBoardImage(linkedBoard?.imageKey)

  const url = isCapsule ? (item.imageUrl ?? privateUrl ?? linkedUrl) : uploadedUrl

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
