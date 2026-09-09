import { useEffect } from 'react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { isWardrobeItemBoard } from '../../lib/visualBoards'
import {
  autoMatchVisualBoardForWardrobeItem,
  getEffectiveCapsule,
  outfitDayHintForItem,
  wardrobeVisualLinkKey,
} from '../../lib/wardrobeOutfits'

// Reconciliation pass: every time the trip's uploaded VisualBoards
// change, tries a conservative auto-match (lib/wardrobeOutfits.ts
// autoMatchVisualBoardForWardrobeItem) for every wardrobe item that has
// no seeded public photo and no recorded link decision yet (key absent
// in useAppStore's wardrobeVisualLinks), and persists a match the
// moment one becomes confident.
//
// Deliberately keeps re-trying an unmatched item on every later upload
// rather than giving up after one attempt — Cecilia uploads her visuals
// over time, not all at once, so an item with no match today (e.g. no
// accessories photo uploaded yet) still needs to pick one up the moment
// a matching photo arrives later, not just retroactively on page
// reload. The only thing this never overwrites is a traveler's own
// explicit decision: linking (or unlinking) an item via the "Use
// existing visual" picker/Unlink button writes a real value (a
// VisualBoard.id, or null for "no link") into wardrobeVisualLinks,
// which makes `key in wardrobeVisualLinks` true and permanently excludes
// that item from this pass — never silently reconsidered again. Mounted
// once in AppShell so every page (Outfit Board, Trip, Today) sees the
// same already-resolved links instead of each doing its own live
// matching.
export function useAutoLinkWardrobeVisuals(trip: Trip) {
  const shareMode = useAppStore((s) => s.shareMode)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeVisualLinks = useAppStore((s) => s.wardrobeVisualLinks)
  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const linkWardrobeVisual = useAppStore((s) => s.linkWardrobeVisual)

  useEffect(() => {
    // Auto-linking is a management side effect (writes to the store) —
    // never runs in Share mode, same as every other edit affordance.
    if (shareMode) return
    // Wardrobe-item-kind uploads are excluded from the candidate pool —
    // linking is for reusing a true multi-item board as a stand-in
    // photo, not for treating one already-distinct wardrobe piece as
    // another item's picture (see LinkVisualSheet's identical filter).
    const tripBoards = visualBoards.filter((b) => b.tripId === trip.meta.id && !isWardrobeItemBoard(b))
    if (tripBoards.length === 0) return
    // Matches against the effective (override-applied) item — a
    // traveler's rename should immediately start matching new uploads
    // by its new name/category, not the stale seeded one.
    for (const item of getEffectiveCapsule(trip, wardrobeItemOverrides)) {
      if (item.imageUrl) continue
      const key = wardrobeVisualLinkKey(trip.meta.id, item.id)
      if (key in wardrobeVisualLinks) continue
      const dayHint = outfitDayHintForItem(trip, item)
      const match = autoMatchVisualBoardForWardrobeItem(item, tripBoards, dayHint)
      if (match) linkWardrobeVisual(trip.meta.id, item.id, match.id)
      // No match yet: leave the key absent (not null) so this item is
      // reconsidered the next time visualBoards changes, instead of
      // being locked out the moment a later, actually-matching upload
      // arrives.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, visualBoards, shareMode, wardrobeItemOverrides])
}
