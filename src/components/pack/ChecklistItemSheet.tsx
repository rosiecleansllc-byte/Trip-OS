import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useChecklistItemUiStore } from '../../store/useChecklistItemUiStore'
import { checklistCategoriesInOrder, checklistItemOverrideKey, getEffectiveChecklist } from '../../lib/checklist'
import { usePrivateDocKeySet } from '../../lib/walletDocs'

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

interface FormState {
  label: string
  category: string
  newCategory: string
  optional: boolean
}

function emptyForm(defaultCategory?: string): FormState {
  return { label: '', category: defaultCategory ?? '', newCategory: '', optional: false }
}

// Add or edit a Pack → Checklist item — the only editing surface for
// both a traveler-added custom item and a seeded one (via a local
// override, never mutating seed data at runtime; see lib/checklist.ts
// ChecklistItemOverride). Deliberately minimal: label, category,
// optional — no linking UI, since `linkedDocumentKey` is only ever set
// by a trip's own seed data, matching "keep the checklist itself
// simple" even while the system underneath is smarter.
export function ChecklistItemSheet({ trip }: { trip: Trip }) {
  const step = useChecklistItemUiStore((s) => s.step)
  const editingItem = useChecklistItemUiStore((s) => s.editingItem)
  const defaultCategory = useChecklistItemUiStore((s) => s.defaultCategory)
  const close = useChecklistItemUiStore((s) => s.close)

  const packedItems = useAppStore((s) => s.packedItems)
  const checklistItemOverrides = useAppStore((s) => s.checklistItemOverrides)
  const customChecklistItems = useAppStore((s) => s.customChecklistItems)
  const addCustomChecklistItem = useAppStore((s) => s.addCustomChecklistItem)
  const updateCustomChecklistItem = useAppStore((s) => s.updateCustomChecklistItem)
  const deleteCustomChecklistItem = useAppStore((s) => s.deleteCustomChecklistItem)
  const setChecklistItemOverride = useAppStore((s) => s.setChecklistItemOverride)
  const { keys: presentDocKeys } = usePrivateDocKeySet()

  const allItems = getEffectiveChecklist(trip, checklistItemOverrides, customChecklistItems, packedItems, presentDocKeys)
  const existingCategories = checklistCategoriesInOrder(allItems)

  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (step === 'open') {
      setForm(
        editingItem
          ? { label: editingItem.label, category: editingItem.category, newCategory: '', optional: editingItem.optional }
          : emptyForm(defaultCategory)
      )
      setConfirmingDelete(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingItem, defaultCategory])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const resolvedCategory = form.newCategory.trim() || form.category
  const isValid = Boolean(form.label.trim()) && Boolean(resolvedCategory)

  const handleSave = () => {
    const patch = { label: form.label.trim(), category: resolvedCategory, optional: form.optional || undefined }
    if (editingItem) {
      if (editingItem.isCustom) {
        updateCustomChecklistItem(editingItem.id, patch)
      } else {
        setChecklistItemOverride(trip.meta.id, editingItem.id, patch)
      }
    } else {
      addCustomChecklistItem({
        id: `chk-custom-${crypto.randomUUID()}`,
        tripId: trip.meta.id,
        ...patch,
      })
    }
    close()
  }

  const handleDelete = () => {
    if (!editingItem) return
    if (editingItem.isCustom) {
      deleteCustomChecklistItem(editingItem.id)
    } else {
      setChecklistItemOverride(trip.meta.id, editingItem.id, { deleted: true })
    }
    close()
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div
        key={editingItem ? checklistItemOverrideKey(trip.meta.id, editingItem.id) : 'new'}
        className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">{editingItem ? 'Edit item' : 'Add item'}</p>
            <button aria-label="Close" onClick={close} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Item</label>
              <input
                className={inputClass}
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                placeholder="e.g. Charge portable battery"
                autoFocus
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.newCategory ? '' : form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Or a new category</label>
              <input
                className={inputClass}
                value={form.newCategory}
                onChange={(e) => set('newCategory', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <button
              type="button"
              onClick={() => set('optional', !form.optional)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-line p-3"
            >
              <span
                className={clsx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  form.optional ? 'border-blue bg-blue' : 'border-line'
                )}
              >
                {form.optional && <span className="h-2 w-2 rounded-sm bg-white" />}
              </span>
              <span className="text-left text-sm text-ink">
                Optional
                <span className="block text-xs text-ink-soft">Won't count against readiness</span>
              </span>
            </button>
          </div>

          <button
            type="button"
            disabled={!isValid}
            onClick={handleSave}
            className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {editingItem ? 'Save changes' : 'Add item'}
          </button>

          {editingItem && (
            <div className="mt-3 text-center">
              {confirmingDelete ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-ink-soft">Delete this item?</span>
                  <button type="button" onClick={() => setConfirmingDelete(false)} className="text-xs font-medium text-ink-soft">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} className="text-xs font-medium text-red">
                    Delete
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} className="text-xs font-medium text-red">
                  Delete item
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
