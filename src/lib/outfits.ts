import type { DayPlan, OutfitBoard, Trip, VisualBoard } from '../types/trip'

// Generic multi-outfit-per-day support, layered on top of the existing
// seeded OutfitBoard/DayPlan.outfitBoardId shapes without changing them —
// every trip that only ever sets outfitBoardId (e.g. France, one look per
// day) keeps working exactly as before; a day with more than one look
// sets outfitBoardIds instead. This is the one place that resolves
// either form, so no page needs to know which one a given day used.
export function getOutfitBoardsForDay(trip: Trip, day: DayPlan): OutfitBoard[] {
  if (day.outfitBoardIds && day.outfitBoardIds.length > 0) {
    return day.outfitBoardIds
      .map((id) => trip.outfitBoards.find((b) => b.id === id))
      .filter((b): b is OutfitBoard => Boolean(b))
  }
  const single = day.outfitBoardId ? trip.outfitBoards.find((b) => b.id === day.outfitBoardId) : undefined
  return single ? [single] : []
}

// Every seeded OutfitBoard across the whole trip, in day order — the
// structural definition behind a trip's master "Outfit Board" view (see
// components/visuals/OutfitBoardSection.tsx). Pure text/metadata, safe
// to seed; the traveler's own uploaded photos are matched in separately,
// never baked into this list.
export function allOutfitBoardsInOrder(trip: Trip): { day: DayPlan; board: OutfitBoard }[] {
  const out: { day: DayPlan; board: OutfitBoard }[] = []
  for (const day of trip.days) {
    for (const board of getOutfitBoardsForDay(trip, day)) {
      out.push({ day, board })
    }
  }
  return out
}

// Best-effort match between a plain-text wardrobe item name (an
// OutfitBoard.itemNames entry, e.g. "White Sneakers") and something the
// traveler has actually uploaded — case-insensitive, either string
// containing the other, so "Sneakers" matches an upload titled "White
// Sneakers" and vice versa. Deliberately loose (never invents a match
// across two clearly different names) since this only ever decides
// whether to show a real photo or a graceful placeholder — never data
// that itself gets saved or trusted for anything else.
export function matchVisualBoardForItemName(boards: VisualBoard[], itemName: string): VisualBoard | undefined {
  const needle = itemName.trim().toLowerCase()
  if (!needle) return undefined
  return boards.find((b) => {
    const hay = b.title.trim().toLowerCase()
    return hay.length > 0 && (hay.includes(needle) || needle.includes(hay))
  })
}

// Best-effort match between a seeded look's own label (e.g. "Franklin's
// BBQ") and a traveler-uploaded whole-outfit visual — an 'outfit'-type
// VisualBoard the traveler photographed/uploaded as a complete look,
// rather than a single garment. This takes priority over per-item
// matching (matchVisualBoardForItemName) so a look renders complete as
// soon as ONE outfit photo exists for it, without requiring every
// individual piece to also be uploaded and titled to match.
//
// Same case-insensitive substring matching as matchVisualBoardForItemName
// (title vs. label may each be the more specific string), scoped to
// type==='outfit'. dayId disambiguates when both sides have one — needed
// since a day can carry more than one look (e.g. Sept 9's Travel Day +
// Franklin's BBQ share a dayId, so title is what tells them apart); an
// upload the traveler left on "Whole trip (no specific day)" still
// matches by title alone, on any day.
export function matchWholeOutfitVisualForLook(
  boards: VisualBoard[],
  dayId: string | undefined,
  lookLabel: string | undefined
): VisualBoard | undefined {
  const needle = (lookLabel ?? '').trim().toLowerCase()
  if (!needle) return undefined
  const titleMatches = boards.filter((b) => {
    if (b.type !== 'outfit') return false
    const hay = b.title.trim().toLowerCase()
    return hay.length > 0 && (hay.includes(needle) || needle.includes(hay))
  })
  if (titleMatches.length === 0) return undefined
  return (
    titleMatches.find((b) => dayId && b.dayId === dayId) ??
    titleMatches.find((b) => !b.dayId) ??
    titleMatches[0]
  )
}
