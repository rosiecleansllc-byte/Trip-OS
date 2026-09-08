import type { CapsuleCategory, CapsuleItem, DayPlan, Outfit, Trip, VisualBoard, VisualBoardType } from '../types/trip'

// Single source of truth for wardrobe category display, shared by
// Pack's Wardrobe tab grid and AddOutfitSheet's item picker so the two
// never drift.
export const WARDROBE_CATEGORY_LABELS: Record<CapsuleCategory, string> = {
  outerwear: 'Outerwear',
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  bag: 'Bags',
  accessory: 'Accessories',
  other: 'Other',
}

export const WARDROBE_CATEGORY_ORDER: CapsuleCategory[] = [
  'outerwear',
  'top',
  'bottom',
  'dress',
  'shoes',
  'bag',
  'accessory',
  'other',
]

// The reference-based outfit system — see types/trip.ts Outfit for the
// full rationale. This is the current way to build a trip's outfits
// (Austin uses it); lib/outfits.ts's OutfitBoard/itemNames functions
// stay untouched for trips (France) still on the older text-scaffold
// system. Both can coexist on the same trip in principle, though today
// each trip only ever populates one or the other.

export function sortOutfits(outfits: Outfit[]): Outfit[] {
  return [...outfits].sort((a, b) => {
    if (Boolean(a.primaryForDay) !== Boolean(b.primaryForDay)) return a.primaryForDay ? -1 : 1
    return a.sortOrder - b.sortOrder
  })
}

// Every outfit assigned to a given day — seeded (Trip.outfits) and
// traveler-created (useAppStore's outfits, passed in already filtered
// or not; this filters by tripId itself) combined and sorted together,
// so a day with one of each still reads as one ordered list. A day can
// carry more than one outfit (e.g. Austin's Sept 9) simply because more
// than one Outfit shares that dayId — no special-casing needed here.
export function getOutfitsForDay(trip: Trip, storeOutfits: Outfit[], dayId: string): Outfit[] {
  const seeded = (trip.outfits ?? []).filter((o) => o.dayId === dayId)
  const custom = storeOutfits.filter((o) => o.tripId === trip.meta.id && o.dayId === dayId)
  return sortOutfits([...seeded, ...custom])
}

// Every seeded Outfit across the whole trip, in day order — the backing
// list for a trip's visual Outfit Board (see
// components/wardrobe/WardrobeOutfitBoardSection.tsx). Traveler-created
// outfits aren't included here; the board is specifically the curated,
// seeded set of looks.
export function allSeededOutfitsInOrder(trip: Trip): { day: DayPlan; outfit: Outfit }[] {
  const out: { day: DayPlan; outfit: Outfit }[] = []
  for (const day of trip.days) {
    for (const outfit of (trip.outfits ?? []).filter((o) => o.dayId === day.id)) {
      out.push({ day, outfit })
    }
  }
  return out
}

export function resolveOutfitItems(trip: Trip, outfit: Outfit): CapsuleItem[] {
  return outfit.itemIds
    .map((id) => trip.capsule.find((c) => c.id === id))
    .filter((c): c is CapsuleItem => Boolean(c))
}

// Same IndexedDB key scheme CapsuleItemImage.tsx already writes to for
// an imageless wardrobe item's private photo — reading it here (rather
// than inventing a second key format) is what lets the Outfit Board and
// Outfit detail show a piece's photo the moment it's been uploaded once
// in the Wardrobe tab, with no separate re-upload ever required.
export function wardrobeItemImageKey(trip: Trip, item: CapsuleItem): string {
  return `capsule-${trip.meta.id}-${item.id}`
}

export function outfitDayLabel(trip: Trip, dayId: string | undefined): string | undefined {
  if (!dayId) return undefined
  const day = trip.days.find((d) => d.id === dayId)
  return day ? `Day ${day.dayNumber} · ${day.title}` : undefined
}

// Reusing an already-uploaded VisualBoard for a wardrobe item — lets a
// traveler's real-world outfit/accessory photos back new wardrobe items
// automatically instead of requiring a dedicated re-upload per item. See
// useAppStore's wardrobeVisualLinks (the persisted decision — a real
// link, or explicit "no link") and
// components/wardrobe/useAutoLinkWardrobeVisuals.ts (the one place that
// computes and persists an automatic match). WardrobeItemThumb and
// CapsuleItemImage both read the persisted link only — never a live
// match of their own — so "Unlink" always has a real, stable effect.

export function wardrobeVisualLinkKey(tripId: string, itemId: string): string {
  return `${tripId}:${itemId}`
}

// Maps a wardrobe category to the one VisualBoardType a traveler would
// plausibly have photographed it under as a themed group shot (a shoes
// flat-lay, an accessories flat-lay) — the least-specific tier of
// autoMatchVisualBoardForWardrobeItem below. Categories with no natural
// themed-board equivalent (tops, bottoms, dresses, outerwear) rely on
// the title tier alone, which is how a single whole-look photo (e.g.
// "White button-down + red leggings travel outfit") ends up backing
// more than one item.
const WARDROBE_CATEGORY_TO_VISUAL_TYPE: Partial<Record<CapsuleCategory, VisualBoardType>> = {
  shoes: 'shoes',
  bag: 'accessories',
  accessory: 'accessories',
}

// Best-effort, conservative match between a wardrobe item and one of the
// trip's already-uploaded VisualBoards. Two tiers, most specific first;
// returns undefined (never guesses) the moment more than one candidate
// remains and dayId can't break the tie:
//
//   1. Title: the same loose case-insensitive substring match
//      OutfitBoard's itemNames already trust (see matchVisualBoardForItemName
//      in lib/outfits.ts) — a photo titled "White button-down + red
//      leggings travel outfit" matches BOTH the White Button-Down top and
//      the Red Leggings bottom, since each item's name is a substring of
//      the photo's title. More than one title match is resolved by dayId
//      when exactly one candidate is scoped to it, else left unmatched.
//   2. Type: a themed board (shoes/accessories) the item's category maps
//      to — only when it's the SINGLE board of that type, so one shoes
//      photo backs every pair of shoes until a second, more specific
//      upload exists, at which point every shoe reverts to needing a
//      title match or the traveler's own "Use existing visual" pick.
export function autoMatchVisualBoardForWardrobeItem(
  item: CapsuleItem,
  visualBoards: VisualBoard[],
  dayId?: string
): VisualBoard | undefined {
  const needle = item.name.trim().toLowerCase()
  const titleMatches = needle
    ? visualBoards.filter((b) => {
        const hay = b.title.trim().toLowerCase()
        return hay.length > 0 && (hay.includes(needle) || needle.includes(hay))
      })
    : []
  if (titleMatches.length === 1) return titleMatches[0]
  if (titleMatches.length > 1) {
    const dayScoped = dayId ? titleMatches.filter((b) => b.dayId === dayId) : []
    return dayScoped.length === 1 ? dayScoped[0] : undefined
  }

  const boardType = WARDROBE_CATEGORY_TO_VISUAL_TYPE[item.category]
  if (!boardType) return undefined
  const typeMatches = visualBoards.filter((b) => b.type === boardType)
  if (typeMatches.length === 1) return typeMatches[0]
  if (typeMatches.length > 1 && dayId) {
    const dayScoped = typeMatches.filter((b) => b.dayId === dayId)
    if (dayScoped.length === 1) return dayScoped[0]
  }
  return undefined
}

// The dayId hint autoMatchVisualBoardForWardrobeItem uses to break a tie
// between same-day candidates — every seeded Outfit that references this
// item, collapsed to a single day when they all agree (e.g. Austin's
// White Button-Down is worn on d1 by both Sept 9 looks). More than one
// distinct day (or none) yields no hint, which is fine — the hint only
// ever breaks a tie, never makes a match that title/type alone wouldn't
// already support.
export function outfitDayHintForItem(trip: Trip, item: CapsuleItem): string | undefined {
  const dayIds = new Set(
    (trip.outfits ?? []).filter((o) => o.itemIds.includes(item.id) && o.dayId).map((o) => o.dayId as string)
  )
  return dayIds.size === 1 ? [...dayIds][0] : undefined
}

// Reads back a wardrobe item's persisted link (see useAppStore's
// wardrobeVisualLinks) — a real VisualBoard, or undefined if unlinked/
// never evaluated/the linked board no longer exists. Never computes a
// live match itself.
export function resolveLinkedVisualBoard(
  trip: Trip,
  item: CapsuleItem,
  visualBoards: VisualBoard[],
  wardrobeVisualLinks: Record<string, string | null>
): VisualBoard | undefined {
  const linkedId = wardrobeVisualLinks[wardrobeVisualLinkKey(trip.meta.id, item.id)]
  if (!linkedId) return undefined
  return visualBoards.find((b) => b.id === linkedId && b.tripId === trip.meta.id)
}
