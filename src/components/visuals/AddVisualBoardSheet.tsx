import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Building2, Layers, Luggage, ImageIcon, Shirt, Sparkles, X } from 'lucide-react'
import type { Trip, VisualBoard, VisualBoardType } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useVisualBoardUiStore } from '../../store/useVisualBoardUiStore'
import { createVisualBoard, putVisualBoardImage, VISUAL_BOARD_TYPE_META } from '../../lib/visualBoards'
import { Lightbox } from '../ui/Lightbox'

const TYPE_ICON: Record<VisualBoardType, typeof Shirt> = {
  outfit: Shirt,
  capsule: Layers,
  packing: Luggage,
  mood: Sparkles,
  city: Building2,
  other: ImageIcon,
}

const TYPE_ORDER: VisualBoardType[] = ['outfit', 'capsule', 'packing', 'mood', 'city', 'other']

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

interface FormState {
  title: string
  dayId: string
  notes: string
}

function emptyForm(): FormState {
  return { title: '', dayId: '', notes: '' }
}

function formFromBoard(board: VisualBoard): FormState {
  return { title: board.title, dayId: board.dayId ?? '', notes: board.notes ?? '' }
}

export function AddVisualBoardSheet({ trip }: { trip: Trip }) {
  const step = useVisualBoardUiStore((s) => s.step)
  const type = useVisualBoardUiStore((s) => s.type)
  const editingBoard = useVisualBoardUiStore((s) => s.editingBoard)
  const pickType = useVisualBoardUiStore((s) => s.pickType)
  const close = useVisualBoardUiStore((s) => s.close)

  const addVisualBoard = useAppStore((s) => s.addVisualBoard)
  const updateVisualBoard = useAppStore((s) => s.updateVisualBoard)

  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // The picked image lives only here until Save writes it into the
  // visual-board IndexedDB wallet under the board's own imageKey — same
  // hold-in-memory-until-save approach as AddItemSheet's pendingScreenshot.
  // On edit, the existing image is loaded into this same slot lazily
  // (only if the traveler chooses to replace it) rather than eagerly, so
  // opening the form to edit a title doesn't need to touch IndexedDB at all.
  const [pendingImage, setPendingImageState] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const setPendingImage = (file: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    if (file) {
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
    setPendingImageState(file)
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (step === 'form' && editingBoard) {
      setForm(formFromBoard(editingBoard))
      setPendingImage(null)
      setImageError(null)
      setSaved(false)
    } else if (step === 'form' && !editingBoard) {
      setForm(emptyForm())
      setPendingImage(null)
      setImageError(null)
      setSaved(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingBoard])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingImage(file)
  }

  const handleSave = async () => {
    if (!type) return
    setSaving(true)

    const selectedDay = form.dayId ? trip.days.find((d) => d.id === form.dayId) : undefined
    const patch = {
      tripId: trip.meta.id,
      type,
      title: form.title.trim(),
      dayId: selectedDay?.id,
      date: selectedDay?.date,
      notes: form.notes.trim() || undefined,
    }

    let board: VisualBoard
    if (editingBoard) {
      updateVisualBoard(editingBoard.id, patch)
      board = { ...editingBoard, ...patch }
    } else {
      board = createVisualBoard(patch)
      addVisualBoard(board)
    }

    // The metadata above is already fully saved regardless of what happens
    // here — a failure only leaves the board without a (new) image, never
    // half-saved — same independent-failure-handling approach as
    // AddItemSheet's screenshot save.
    let imageErrorMessage: string | null = null
    if (pendingImage) {
      try {
        await putVisualBoardImage(board.imageKey, pendingImage)
      } catch {
        imageErrorMessage = "Saved, but the image couldn't be attached. You can replace it again from this board."
      }
    } else if (!editingBoard) {
      imageErrorMessage = 'Saved without an image — add one anytime by replacing it from this board.'
    }

    setPendingImage(null)
    setImageError(imageErrorMessage)
    setSaving(false)
    setSaved(true)
  }

  const isValid = Boolean(form.title.trim())

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {saved ? (
          <div className="px-5 pt-2">
            <p className="font-display text-lg text-ink">Saved</p>
            {imageError && <p className="mt-3 text-xs text-ink-soft">{imageError}</p>}
            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-full bg-blue py-3 text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        ) : step === 'picker' ? (
          <div className="px-5 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-ink">Add visual</p>
              <button aria-label="Close" onClick={close} className="text-ink-soft">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {TYPE_ORDER.map((t) => {
                const meta = VISUAL_BOARD_TYPE_META[t]
                const Icon = TYPE_ICON[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pickType(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-blue/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-tint text-blue">
                      <Icon size={17} />
                    </span>
                    <span className="text-sm font-medium text-ink">{meta.pickerLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          type && (
            <div className="px-5 pt-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-lg text-ink">
                  {editingBoard ? `Edit ${VISUAL_BOARD_TYPE_META[type].label}` : `Add ${VISUAL_BOARD_TYPE_META[type].label}`}
                </p>
                <button aria-label="Close" onClick={close} className="text-ink-soft">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Image</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg-soft py-6 text-center"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxOpen(true)
                        }}
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                    ) : (
                      <ImageIcon size={22} className="text-ink-soft" />
                    )}
                    <span className="text-xs font-medium text-blue">
                      {previewUrl ? 'Replace image' : 'Upload photo'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder={type === 'outfit' ? 'e.g. Summit outfit' : 'Board title'}
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
                    className={clsx(inputClass, 'min-h-[72px] resize-none')}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!isValid || saving}
                onClick={handleSave}
                className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {saving ? 'Saving…' : editingBoard ? 'Save changes' : 'Add visual'}
              </button>
            </div>
          )
        )}
      </div>
      {lightboxOpen && previewUrl && (
        <Lightbox src={previewUrl} alt="Visual board preview" onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
