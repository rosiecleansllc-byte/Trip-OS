import type { ChecklistItem, ChecklistItemOverride, CustomChecklistItem, Trip } from '../types/trip'

// Generic engine behind Pack → Checklist — the same category → item →
// tap-to-check interaction for any trip, whether it seeds three plain
// categories (Austin) or a dozen richer ones with linked confirmations
// and optional items (France). Nothing here names a specific trip.

export function checklistItemOverrideKey(tripId: string, itemId: string): string {
  return `${tripId}:${itemId}`
}

export interface EffectiveChecklistItem {
  id: string
  category: string
  label: string
  optional: boolean
  linkedDocumentKey?: string
  isCustom: boolean
  // True once EITHER the traveler tapped it (packedItems) OR — for a
  // linked item — its confirmation document is already stored on this
  // device (see lib/privateDocs.ts). A confirmed booking status alone
  // never counts; only the document itself does.
  checked: boolean
  // True only when `checked` came from the linked document rather than
  // a manual tap — lets the UI show a quiet "confirmed" indicator
  // instead of implying the traveler checked it herself.
  autoChecked: boolean
}

// Every seeded item on this trip, with any local override applied (a
// `deleted` override drops it entirely) — the id-stable "effective"
// checklist that Pack's Checklist tab and Today's reminder card should
// both read from instead of trip.checklist directly. Mirrors
// lib/wardrobeOutfits.ts's getEffectiveCapsule for the same reason: the
// trip's own seed data is immutable, so edits live in `overrides`.
function effectiveSeededItems(trip: Trip, overrides: Record<string, ChecklistItemOverride>): ChecklistItem[] {
  const items: ChecklistItem[] = []
  for (const item of trip.checklist ?? []) {
    const override = overrides[checklistItemOverrideKey(trip.meta.id, item.id)]
    if (override?.deleted) continue
    items.push({
      ...item,
      label: override?.label ?? item.label,
      category: override?.category ?? item.category,
      optional: override?.optional ?? item.optional,
    })
  }
  return items
}

// Combines a trip's seeded checklist (with overrides applied) and the
// traveler's own custom items into the one list every checklist surface
// renders — each with its actual checked state already resolved.
export function getEffectiveChecklist(
  trip: Trip,
  overrides: Record<string, ChecklistItemOverride>,
  custom: CustomChecklistItem[],
  packedItems: Record<string, boolean>,
  presentDocKeys: Set<string>
): EffectiveChecklistItem[] {
  const seeded = effectiveSeededItems(trip, overrides)
  const customForTrip = custom.filter((c) => c.tripId === trip.meta.id)

  const resolve = (item: ChecklistItem, isCustom: boolean): EffectiveChecklistItem => {
    const manuallyChecked = Boolean(packedItems[checklistItemOverrideKey(trip.meta.id, item.id)])
    const autoChecked = !manuallyChecked && Boolean(item.linkedDocumentKey && presentDocKeys.has(item.linkedDocumentKey))
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      optional: Boolean(item.optional),
      linkedDocumentKey: item.linkedDocumentKey,
      isCustom,
      checked: manuallyChecked || autoChecked,
      autoChecked,
    }
  }

  return [...seeded.map((i) => resolve(i, false)), ...customForTrip.map((i) => resolve(i, true))]
}

export function checklistCategoriesInOrder(items: EffectiveChecklistItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.category)))
}

export interface ChecklistProgress {
  checked: number
  total: number
  percent: number
}

// Optional items never count toward the denominator (or numerator) —
// an unchecked optional item can't drag the percentage down, per Trip
// OS's "optional is visible but never a readiness penalty" rule.
export function computeChecklistProgress(items: EffectiveChecklistItem[]): ChecklistProgress {
  const required = items.filter((i) => !i.optional)
  const checked = required.filter((i) => i.checked).length
  const total = required.length
  return { checked, total, percent: total > 0 ? Math.round((checked / total) * 100) : 0 }
}

// Category priority for Today's "N things before {trip}" reminder —
// departure-critical categories surface first, packing-adjacent ones
// last. A category not named here (any trip can seed whatever
// categories it wants) sorts after every named one, in seeded order.
const CATEGORY_PRIORITY = ['Before You Go', 'Transportation', 'Travel', 'Documents', 'Reservations', 'Tech']

// The most important still-unfinished (required, unchecked) items, for
// a compact pre-trip reminder — never the whole checklist. Capped by
// `limit`; ties keep their original relative order.
export function getImportantUnfinishedChecklistItems(items: EffectiveChecklistItem[], limit: number): EffectiveChecklistItem[] {
  const priority = (category: string) => {
    const idx = CATEGORY_PRIORITY.indexOf(category)
    return idx === -1 ? CATEGORY_PRIORITY.length : idx
  }
  return items
    .filter((i) => !i.optional && !i.checked)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priority(a.item.category) - priority(b.item.category) || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item)
}
