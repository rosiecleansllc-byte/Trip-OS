import type { CapsuleCategory, CapsuleItem, DayPlan, Outfit, Trip } from '../types/trip'

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
