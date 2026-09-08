import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Check, ImageIcon, X } from 'lucide-react'
import type { OutfitLook, Trip, VisualBoard } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useOutfitLookUiStore } from '../../store/useOutfitLookUiStore'
import { useVisualBoardImage } from '../../lib/visualBoards'

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

interface FormState {
  title: string
  dayId: string
  notes: string
  visualBoardIds: string[]
}

function emptyForm(): FormState {
  return { title: '', dayId: '', notes: '', visualBoardIds: [] }
}

function formFromLook(look: OutfitLook): FormState {
  return { title: look.title, dayId: look.dayId ?? '', notes: look.notes ?? '', visualBoardIds: [...look.visualBoardIds] }
}

// One selectable row in the "link photos" list — its own hook call for
// the thumbnail, same as every other VisualBoard-thumbnail call site.
function PickRow({
  board,
  selected,
  onToggle,
}: {
  board: VisualBoard
  selected: boolean
  onToggle: () => void
}) {
  const { url } = useVisualBoardImage(board.imageKey)
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
        selected ? 'border-blue bg-blue-tint/40' : 'border-line'
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-soft">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-ink-soft" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{board.title}</span>
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

// Composes several of the traveler's own already-uploaded visuals (a
// shoes photo, an accessories photo, a top photo, ...) into one named
// look — see types/trip.ts OutfitLook. Unlike AddVisualBoardSheet, there
// is no image picker here at all: an OutfitLook never owns a photo of
// its own, it only links to ones that already exist as VisualBoards.
export function AddOutfitLookSheet({ trip }: { trip: Trip }) {
  const step = useOutfitLookUiStore((s) => s.step)
  const editingLook = useOutfitLookUiStore((s) => s.editingLook)
  const close = useOutfitLookUiStore((s) => s.close)

  const visualBoards = useAppStore((s) => s.visualBoards)
  const outfitLooks = useAppStore((s) => s.outfitLooks)
  const addOutfitLook = useAppStore((s) => s.addOutfitLook)
  const updateOutfitLook = useAppStore((s) => s.updateOutfitLook)

  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (step === 'form') {
      setForm(editingLook ? formFromLook(editingLook) : emptyForm())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingLook])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const toggleBoard = (id: string) =>
    setForm((f) => ({
      ...f,
      visualBoardIds: f.visualBoardIds.includes(id)
        ? f.visualBoardIds.filter((x) => x !== id)
        : [...f.visualBoardIds, id],
    }))

  const tripBoards = visualBoards.filter((b) => b.tripId === trip.meta.id)
  const isValid = Boolean(form.title.trim())

  const handleSave = () => {
    setSaving(true)
    const selectedDay = form.dayId ? trip.days.find((d) => d.id === form.dayId) : undefined
    const patch = {
      tripId: trip.meta.id,
      title: form.title.trim(),
      dayId: selectedDay?.id,
      notes: form.notes.trim() || undefined,
      visualBoardIds: form.visualBoardIds,
    }
    if (editingLook) {
      updateOutfitLook(editingLook.id, patch)
    } else {
      const tripLooks = outfitLooks.filter((l) => l.tripId === trip.meta.id)
      addOutfitLook({ id: `look-${crypto.randomUUID()}`, sortOrder: tripLooks.length, ...patch })
    }
    setSaving(false)
    close()
  }

  // Rendered via portal straight to <body> — see AddVisualBoardSheet for
  // why: nested inside a page's .animate-fade-in wrapper, this sheet's
  // "fixed inset-0" would otherwise be trapped inside that ancestor's
  // post-animation containing block/stacking context instead of the
  // true viewport.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">{editingLook ? 'Edit look' : 'Add look'}</p>
            <button aria-label="Close" onClick={close} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
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
              <label className={labelClass}>Photos in this look</label>
              {tripBoards.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-bg-soft px-3 py-4 text-center text-xs text-ink-soft">
                  Upload a visual in Pack first, then link it here.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tripBoards.map((board) => (
                    <PickRow
                      key={board.id}
                      board={board}
                      selected={form.visualBoardIds.includes(board.id)}
                      onToggle={() => toggleBoard(board.id)}
                    />
                  ))}
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
            {saving ? 'Saving…' : editingLook ? 'Save changes' : 'Add look'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
