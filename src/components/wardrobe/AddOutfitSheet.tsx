import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Check, X } from 'lucide-react'
import type { Outfit, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useOutfitUiStore } from '../../store/useOutfitUiStore'
import { WARDROBE_CATEGORY_LABELS, WARDROBE_CATEGORY_ORDER, allWardrobePieces, type ResolvedWardrobeItem } from '../../lib/wardrobeOutfits'
import { WardrobeItemThumb } from './WardrobeItemThumb'

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

interface FormState {
  name: string
  dayId: string
  notes: string
  itemIds: string[]
}

function emptyForm(): FormState {
  return { name: '', dayId: '', notes: '', itemIds: [] }
}

function formFromOutfit(outfit: Outfit): FormState {
  return { name: outfit.name, dayId: outfit.dayId ?? '', notes: outfit.notes ?? '', itemIds: [...outfit.itemIds] }
}

function PickRow({
  item,
  trip,
  selected,
  onToggle,
}: {
  item: ResolvedWardrobeItem
  trip: Trip
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
        selected ? 'border-blue bg-blue-tint/40' : 'border-line'
      )}
    >
      <WardrobeItemThumb item={item} trip={trip} shareMode={false} size={44} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

// Create/edit a traveler-created Outfit — selects existing wardrobe
// items (trip.capsule), grouped by category, names the outfit, and
// optionally assigns it to a trip day. No image picker of its own: an
// Outfit never owns a photo, it only references CapsuleItems whose own
// images (seeded or privately uploaded — see WardrobeItemThumb) are the
// only place a picture lives.
export function AddOutfitSheet({ trip }: { trip: Trip }) {
  const step = useOutfitUiStore((s) => s.step)
  const editingOutfit = useOutfitUiStore((s) => s.editingOutfit)
  const close = useOutfitUiStore((s) => s.close)

  const storeOutfits = useAppStore((s) => s.outfits)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const addOutfit = useAppStore((s) => s.addOutfit)
  const updateOutfit = useAppStore((s) => s.updateOutfit)
  // Every wardrobe piece this trip can build an outfit from — seeded
  // CapsuleItems (with any local edit applied) plus the traveler's own
  // uploaded wardrobe-item VisualBoards (see lib/wardrobeOutfits.ts).
  // This sheet is never mounted in Share mode (AppShell only renders it
  // outside shareMode), so no zeroing is needed here the way
  // outfit-display surfaces need it.
  const wardrobePieces = allWardrobePieces(trip, visualBoards, wardrobeItemOverrides)

  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (step === 'form') {
      setForm(editingOutfit ? formFromOutfit(editingOutfit) : emptyForm())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingOutfit])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const toggleItem = (id: string) =>
    setForm((f) => ({
      ...f,
      itemIds: f.itemIds.includes(id) ? f.itemIds.filter((x) => x !== id) : [...f.itemIds, id],
    }))

  const isValid = Boolean(form.name.trim())

  const handleSave = () => {
    setSaving(true)
    const selectedDay = form.dayId ? trip.days.find((d) => d.id === form.dayId) : undefined
    const patch = {
      tripId: trip.meta.id,
      name: form.name.trim(),
      dayId: selectedDay?.id,
      notes: form.notes.trim() || undefined,
      itemIds: form.itemIds,
    }
    if (editingOutfit) {
      updateOutfit(editingOutfit.id, patch)
    } else {
      const tripOutfits = storeOutfits.filter((o) => o.tripId === trip.meta.id)
      addOutfit({ id: `outfit-${crypto.randomUUID()}`, sortOrder: tripOutfits.length, ...patch })
    }
    setSaving(false)
    close()
  }

  // Portal to <body> — see AddVisualBoardSheet for
  // why: escapes the host page's .animate-fade-in ancestor, which would
  // otherwise trap this "fixed inset-0" sheet inside its own
  // post-animation containing block instead of the true viewport.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">{editingOutfit ? 'Edit outfit' : 'Create outfit'}</p>
            <button aria-label="Close" onClick={close} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Franklin's BBQ"
              />
            </div>

            <div>
              <label className={labelClass}>Day</label>
              <select className={inputClass} value={form.dayId} onChange={(e) => set('dayId', e.target.value)}>
                <option value="">Whole trip (no specific day)</option>
                {trip.days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber} · {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={clsx(inputClass, 'min-h-[60px] resize-none')}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className={labelClass}>Wardrobe items</label>
              {wardrobePieces.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-bg-soft px-3 py-4 text-center text-xs text-ink-soft">
                  This trip has no wardrobe items yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {WARDROBE_CATEGORY_ORDER.map((cat) => {
                    const items = wardrobePieces.filter((c) => c.category === cat)
                    if (items.length === 0) return null
                    return (
                      <div key={cat}>
                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                          {WARDROBE_CATEGORY_LABELS[cat]}
                        </p>
                        <div className="space-y-1.5">
                          {items.map((item) => (
                            <PickRow
                              key={item.id}
                              item={item}
                              trip={trip}
                              selected={form.itemIds.includes(item.id)}
                              onToggle={() => toggleItem(item.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!isValid || saving}
            onClick={handleSave}
            className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Saving…' : editingOutfit ? 'Save changes' : 'Create outfit'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
