import { clsx } from 'clsx'
import { Check, Pencil, Plus } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { Card } from '../ui/Card'
import { SectionHeader } from '../ui/SectionHeader'
import {
  checklistCategoriesInOrder,
  checklistItemOverrideKey,
  computeChecklistProgress,
  getEffectiveChecklist,
  type EffectiveChecklistItem,
} from '../../lib/checklist'
import { usePrivateDocKeySet } from '../../lib/walletDocs'
import { canShowDocumentPresence } from '../../lib/shareMode'
import { useAppStore } from '../../store/useAppStore'
import { useChecklistItemUiStore } from '../../store/useChecklistItemUiStore'

// One simple tappable row — the same interaction for every trip and
// every category, whether the item is a plain manual toggle or a
// linked confirmation. Tapping the row itself toggles it; the pencil
// is the only way into edit, so a stray tap near the label never
// accidentally opens the sheet instead of checking the item.
//
// Share mode is read-only, same pattern as OpenItemToggle: the checked
// status itself is fine to show, but no mutation control (toggle or
// edit) is ever exposed there.
function ChecklistRow({ item, tripId }: { item: EffectiveChecklistItem; tripId: string }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const togglePacked = useAppStore((s) => s.togglePacked)
  const openEdit = useChecklistItemUiStore((s) => s.openEdit)

  const showBadges = item.optional || (item.autoChecked && canShowDocumentPresence(shareMode))
  const dot = (
    <span
      className={clsx(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
        item.checked ? 'border-blue bg-blue text-white' : 'border-line text-transparent'
      )}
    >
      <Check size={13} strokeWidth={3} />
    </span>
  )
  const labelBlock = (
    <span className="min-w-0 flex-1">
      <span className={clsx('block text-sm', item.checked ? 'text-ink-soft line-through' : 'text-ink')}>
        {item.label}
      </span>
      {showBadges && (
        <span className="mt-0.5 flex gap-1.5">
          {item.optional && (
            <span className="rounded-full border border-line px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-soft no-underline">
              Optional
            </span>
          )}
          {item.autoChecked && canShowDocumentPresence(shareMode) && (
            <span className="rounded-full border border-blue/30 bg-blue-tint px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-blue no-underline">
              Confirmation on file
            </span>
          )}
        </span>
      )}
    </span>
  )

  return (
    <Card className="flex items-center gap-3 p-3.5">
      {shareMode ? (
        <span className="flex flex-1 items-center gap-3 text-left">
          {dot}
          {labelBlock}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => togglePacked(tripId, item.id)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {dot}
          {labelBlock}
        </button>
      )}
      {!shareMode && (
        <button
          type="button"
          aria-label={`Edit ${item.label}`}
          onClick={() => openEdit(item)}
          className="shrink-0 p-1 text-ink-soft"
        >
          <Pencil size={13} />
        </button>
      )}
    </Card>
  )
}

// Pack's checklist — one category heading, a stack of simple tappable
// cards, and a "+ Add item" row per category. Austin's original
// interaction exactly, extended to handle optional items and items
// linked to an existing booking/transport confirmation (see
// lib/checklist.ts) without the row itself looking any different
// unless one of those actually applies. Nothing here is trip-specific:
// any trip's seeded `checklist` (plus whatever the traveler adds)
// renders the same way.
export function ChecklistTab({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const packedItems = useAppStore((s) => s.packedItems)
  const checklistItemOverrides = useAppStore((s) => s.checklistItemOverrides)
  const customChecklistItems = useAppStore((s) => s.customChecklistItems)
  const openAdd = useChecklistItemUiStore((s) => s.openAdd)
  // One IndexedDB read covers every linked item on this tab — see
  // lib/walletDocs.ts usePrivateDocKeySet, already used the same way by
  // the Wallet page.
  const { keys: presentDocKeys } = usePrivateDocKeySet()

  const items = getEffectiveChecklist(trip, checklistItemOverrides, customChecklistItems, packedItems, presentDocKeys)
  const categories = checklistCategoriesInOrder(items)
  const progress = computeChecklistProgress(items)

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">
            {trip.meta.name} Ready · {progress.checked} of {progress.total}
          </p>
          <p className="text-xs font-medium text-blue">{progress.percent}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </Card>

      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category)
        return (
          <div key={category}>
            <SectionHeader eyebrow={`${categoryItems.length} items`} title={category} accent="red" />
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <ChecklistRow key={checklistItemOverrideKey(trip.meta.id, item.id)} item={item} tripId={trip.meta.id} />
              ))}
              {!shareMode && (
                <button
                  type="button"
                  onClick={() => openAdd(category)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-blue"
                >
                  <Plus size={13} /> Add item
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
