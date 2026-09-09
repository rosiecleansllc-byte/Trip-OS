import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { RotateCcw, X } from 'lucide-react'
import type { CapsuleCategory, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useCapsuleItemUiStore } from '../../store/useCapsuleItemUiStore'
import { WARDROBE_CATEGORY_LABELS, WARDROBE_CATEGORY_ORDER, applyCapsuleItemOverride, wardrobeItemOverrideKey } from '../../lib/wardrobeOutfits'
import { WARDROBE_SUBTYPE_PRESETS } from '../../lib/visualBoards'

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

interface FormState {
  name: string
  category: CapsuleCategory
  subtype: string
  color: string
  note: string
}

// Editing surface for a seeded CapsuleItem — see lib/wardrobeOutfits.ts
// CapsuleItemOverride for the "seed merged with local override" model.
// The item's own id is never touched, so every Outfit.itemIds reference
// to it (and its dedicated private-photo IndexedDB key) keeps working
// unchanged across a rename, recategorize, or photo swap.
//
// Portal to <body>, same reasoning as every other bottom sheet in this
// app: escapes the host page's .animate-fade-in ancestor.
export function EditCapsuleItemSheet({ trip }: { trip: Trip }) {
  const step = useCapsuleItemUiStore((s) => s.step)
  const editingItem = useCapsuleItemUiStore((s) => s.editingItem)
  const close = useCapsuleItemUiStore((s) => s.close)

  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const setWardrobeItemOverride = useAppStore((s) => s.setWardrobeItemOverride)
  const resetWardrobeItemOverride = useAppStore((s) => s.resetWardrobeItemOverride)

  const [form, setForm] = useState<FormState | null>(null)

  const overrideKey = editingItem ? wardrobeItemOverrideKey(trip.meta.id, editingItem.id) : undefined
  const override = overrideKey ? wardrobeItemOverrides[overrideKey] : undefined
  const effectiveItem = editingItem ? applyCapsuleItemOverride(editingItem, override) : undefined
  const hasOverride = Boolean(override)
  // A seeded photo was explicitly removed (see CapsuleItemOverride's
  // photoRemoved) — offer to bring it back without touching whatever
  // private photo may have been uploaded in its place.
  const seededPhotoRemoved = Boolean(override?.photoRemoved && editingItem?.imageUrl)

  useEffect(() => {
    if (step === 'open' && effectiveItem) {
      setForm({
        name: effectiveItem.name,
        category: effectiveItem.category,
        subtype: effectiveItem.subtype ?? '',
        color: effectiveItem.color ?? '',
        note: effectiveItem.note ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingItem?.id])

  if (step === 'closed' || !editingItem || !effectiveItem || !form || !overrideKey) return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const subtypePresets = WARDROBE_SUBTYPE_PRESETS[form.category] ?? []
  const isValid = Boolean(form.name.trim())

  const handleSave = () => {
    setWardrobeItemOverride(trip.meta.id, editingItem.id, {
      ...(override ?? {}),
      name: form.name.trim(),
      category: form.category,
      subtype: form.subtype.trim() || undefined,
      color: form.color.trim() || undefined,
      note: form.note.trim() || undefined,
    })
    close()
  }

  const handleReset = () => {
    resetWardrobeItemOverride(trip.meta.id, editingItem.id)
    close()
  }

  const handleRestorePhoto = () => {
    setWardrobeItemOverride(trip.meta.id, editingItem.id, { ...(override ?? {}), photoRemoved: false })
  }

  const handleRemovePhoto = () => {
    setWardrobeItemOverride(trip.meta.id, editingItem.id, { ...(override ?? {}), photoRemoved: true })
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">Edit wardrobe item</p>
            <button aria-label="Close" onClick={close} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Photo</label>
              {effectiveItem.imageUrl ? (
                <div className="relative h-40 w-full overflow-hidden rounded-xl">
                  <img src={effectiveItem.imageUrl} alt={effectiveItem.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute inset-x-0 bottom-0 bg-ink/55 py-1 text-[10px] font-medium text-white"
                  >
                    Remove seeded photo
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-bg-soft px-3 py-4 text-center text-xs text-ink-soft">
                  {seededPhotoRemoved ? (
                    <>
                      <p>Seeded photo removed.</p>
                      <button type="button" onClick={handleRestorePhoto} className="mt-1.5 text-xs font-medium text-blue">
                        Restore seeded photo
                      </button>
                    </>
                  ) : (
                    <p>Use the Add photo button on this item's Wardrobe card to attach one.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Black Midi Skirt"
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <div className="grid grid-cols-2 gap-2">
                {WARDROBE_CATEGORY_ORDER.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      set('category', cat)
                      set('subtype', '')
                    }}
                    className={clsx(
                      'rounded-xl border p-2.5 text-center text-sm font-medium transition-colors',
                      form.category === cat ? 'border-blue bg-blue-tint text-blue' : 'border-line text-ink'
                    )}
                  >
                    {WARDROBE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {subtypePresets.length > 0 && (
              <div>
                <label className={labelClass}>Subtype (optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {subtypePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => set('subtype', form.subtype === preset ? '' : preset)}
                      className={clsx(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        form.subtype === preset ? 'border-blue bg-blue-tint text-blue' : 'border-line text-ink-soft'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Color</label>
              <input
                className={inputClass}
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={clsx(inputClass, 'min-h-[60px] resize-none')}
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!isValid}
            onClick={handleSave}
            className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Save changes
          </button>
          {hasOverride && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-ink-soft"
            >
              <RotateCcw size={12} /> Reset to original
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
