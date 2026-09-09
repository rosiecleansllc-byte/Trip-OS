import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { ChevronLeft, ImageIcon, X } from 'lucide-react'
import type { CapsuleCategory, Trip, VisualBoard, VisualBoardType } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useVisualBoardUiStore } from '../../store/useVisualBoardUiStore'
import { createVisualBoard, putVisualBoardImage, VISUAL_BOARD_TYPE_META, WARDROBE_SUBTYPE_PRESETS } from '../../lib/visualBoards'
import { WARDROBE_CATEGORY_LABELS, WARDROBE_CATEGORY_ORDER } from '../../lib/wardrobeOutfits'
import { Lightbox } from '../ui/Lightbox'

// The 3 most common board types surface directly on the first screen,
// alongside "Individual wardrobe item" — the 4 options Cecilia actually
// asked for. The rest (packing/shoes/accessories/city/other) stay fully
// supported (existing uploads of those types keep rendering exactly as
// before) but live one tap further behind "Other board type", so the
// common case stays fast without losing any existing capability —
// shoes/accessories boards specifically are still what backs the
// auto-link matching in useAutoLinkWardrobeVisuals.
const PRIMARY_BOARD_TYPES: VisualBoardType[] = ['outfit', 'capsule', 'mood']
const SECONDARY_BOARD_TYPES: VisualBoardType[] = ['packing', 'shoes', 'accessories', 'city', 'other']

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

// The sheet's internal flow — deliberately local state (not the UI
// store), so navigating between steps (including "Change type" while
// editing) never re-triggers the effect that populates the form from
// editingBoard and silently discards what's already typed. See
// useVisualBoardUiStore's comment for the bug this replaced.
type Phase = 'kind' | 'moreBoardTypes' | 'boardForm' | 'wardrobeCategory' | 'wardrobeForm'

interface FormState {
  title: string
  dayId: string
  notes: string
}

function emptyForm(): FormState {
  return { title: '', dayId: '', notes: '' }
}

function BigChoiceButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-xl border border-line p-3.5 text-left text-sm font-medium text-ink transition-colors hover:border-blue/40"
    >
      {label}
    </button>
  )
}

function BackHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {onBack && (
          <button type="button" aria-label="Back" onClick={onBack} className="text-ink-soft">
            <ChevronLeft size={18} />
          </button>
        )}
        <p className="font-display text-lg text-ink">{title}</p>
      </div>
      <button aria-label="Close" onClick={onClose} className="text-ink-soft">
        <X size={18} />
      </button>
    </div>
  )
}

export function AddVisualBoardSheet({ trip }: { trip: Trip }) {
  const step = useVisualBoardUiStore((s) => s.step)
  const editingBoard = useVisualBoardUiStore((s) => s.editingBoard)
  const initialKind = useVisualBoardUiStore((s) => s.initialKind)
  const close = useVisualBoardUiStore((s) => s.close)

  const addVisualBoard = useAppStore((s) => s.addVisualBoard)
  const updateVisualBoard = useAppStore((s) => s.updateVisualBoard)

  const [phase, setPhase] = useState<Phase>('kind')
  const [kind, setKind] = useState<'board' | 'wardrobe-item'>('board')
  const [boardType, setBoardType] = useState<VisualBoardType>('outfit')
  const [wardrobeCategory, setWardrobeCategory] = useState<CapsuleCategory>('top')
  const [wardrobeSubtype, setWardrobeSubtype] = useState('')
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // The picked image lives only here until Save writes it into the
  // visual-board IndexedDB wallet under the board's own imageKey — same
  // hold-in-memory-until-save approach as AddItemSheet's pendingScreenshot.
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

  // Populates (or resets) the whole flow exactly once per sheet
  // "session" — a fresh open (step transitions closed -> open) or a
  // different board to edit. Internal navigation between phases never
  // re-fires this, since neither `step` nor `editingBoard` changes then.
  useEffect(() => {
    if (step !== 'open') return
    if (editingBoard) {
      const isWardrobe = editingBoard.visualKind === 'wardrobe-item'
      setKind(isWardrobe ? 'wardrobe-item' : 'board')
      setBoardType(editingBoard.type)
      setWardrobeCategory(editingBoard.wardrobeCategory ?? 'top')
      setWardrobeSubtype(editingBoard.wardrobeSubtype ?? '')
      setForm({ title: editingBoard.title, dayId: editingBoard.dayId ?? '', notes: editingBoard.notes ?? '' })
      setPhase(isWardrobe ? 'wardrobeForm' : 'boardForm')
    } else if (initialKind === 'wardrobe-item') {
      // Pack -> Wardrobe's "Add wardrobe item" — the kind is already
      // implied by which tab this was opened from, so skip the generic
      // chooser and land straight on the category picker.
      setKind('wardrobe-item')
      setWardrobeCategory('top')
      setWardrobeSubtype('')
      setForm(emptyForm())
      setPhase('wardrobeCategory')
    } else {
      setKind('board')
      setBoardType('outfit')
      setWardrobeCategory('top')
      setWardrobeSubtype('')
      setForm(emptyForm())
      setPhase('kind')
    }
    setPendingImage(null)
    setImageError(null)
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingBoard, initialKind])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingImage(file)
  }

  const pickBoardType = (type: VisualBoardType) => {
    setKind('board')
    setBoardType(type)
    setPhase('boardForm')
  }

  const pickWardrobeCategory = (category: CapsuleCategory) => {
    setKind('wardrobe-item')
    setWardrobeCategory(category)
    setPhase('wardrobeForm')
  }

  // Starts a second (third, ...) wardrobe item without leaving the
  // sheet — the store's step/editingBoard stay untouched, so this is
  // purely a local reset, letting Cecilia upload a whole wardrobe's
  // worth of pieces in one sitting without ever closing the sheet.
  const handleAddAnotherWardrobeItem = () => {
    setForm(emptyForm())
    setWardrobeSubtype('')
    setPendingImage(null)
    setImageError(null)
    setSaved(false)
    setPhase('wardrobeCategory')
  }

  const handleSave = async () => {
    setSaving(true)

    const isWardrobe = kind === 'wardrobe-item'
    const selectedDay = !isWardrobe && form.dayId ? trip.days.find((d) => d.id === form.dayId) : undefined
    const patch = isWardrobe
      ? {
          tripId: trip.meta.id,
          type: 'other' as VisualBoardType, // unused for a wardrobe-item entry
          title: form.title.trim(),
          notes: form.notes.trim() || undefined,
          visualKind: 'wardrobe-item' as const,
          wardrobeCategory,
          wardrobeSubtype: wardrobeSubtype.trim() || undefined,
        }
      : {
          tripId: trip.meta.id,
          type: boardType,
          title: form.title.trim(),
          dayId: selectedDay?.id,
          date: selectedDay?.date,
          notes: form.notes.trim() || undefined,
          visualKind: 'board' as const,
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
  const subtypePresets = WARDROBE_SUBTYPE_PRESETS[wardrobeCategory] ?? []

  const imagePicker = (
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
        <span className="text-xs font-medium text-blue">{previewUrl ? 'Replace image' : 'Upload photo'}</span>
      </button>
    </div>
  )

  // Rendered via portal straight to <body> — same reasoning as
  // Lightbox: nesting this fixed-fullscreen sheet inside a page's own
  // .animate-fade-in wrapper leaves it trapped inside that ancestor's
  // (post-animation) containing block/stacking context instead of
  // covering the true viewport, which both mispositions it and lets the
  // fixed bottom nav render on top of its lower portion despite z-40.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {saved ? (
          <div className="px-5 pt-2">
            <p className="font-display text-lg text-ink">Saved</p>
            {imageError && <p className="mt-3 text-xs text-ink-soft">{imageError}</p>}
            {kind === 'wardrobe-item' && !editingBoard ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleAddAnotherWardrobeItem}
                  className="flex-1 rounded-full border border-blue/30 bg-blue-tint py-3 text-sm font-medium text-blue"
                >
                  Add another item
                </button>
                <button type="button" onClick={close} className="flex-1 rounded-full bg-blue py-3 text-sm font-medium text-white">
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={close}
                className="mt-4 w-full rounded-full bg-blue py-3 text-sm font-medium text-white"
              >
                Done
              </button>
            )}
          </div>
        ) : phase === 'kind' ? (
          <div className="px-5 pt-2">
            <BackHeader title="What are you adding?" onClose={close} />
            <div className="space-y-2">
              {PRIMARY_BOARD_TYPES.map((t) => (
                <BigChoiceButton key={t} label={VISUAL_BOARD_TYPE_META[t].pickerLabel} onClick={() => pickBoardType(t)} />
              ))}
              <BigChoiceButton label="Individual wardrobe item" onClick={() => setPhase('wardrobeCategory')} />
            </div>
            <button
              type="button"
              onClick={() => setPhase('moreBoardTypes')}
              className="mt-3 text-xs font-medium text-blue"
            >
              Other board type ›
            </button>
          </div>
        ) : phase === 'moreBoardTypes' ? (
          <div className="px-5 pt-2">
            <BackHeader title="Other board type" onBack={() => setPhase('kind')} onClose={close} />
            <div className="space-y-2">
              {SECONDARY_BOARD_TYPES.map((t) => (
                <BigChoiceButton key={t} label={VISUAL_BOARD_TYPE_META[t].pickerLabel} onClick={() => pickBoardType(t)} />
              ))}
            </div>
          </div>
        ) : phase === 'wardrobeCategory' ? (
          <div className="px-5 pt-2">
            <BackHeader title="What kind of item?" onBack={() => setPhase('kind')} onClose={close} />
            <div className="grid grid-cols-2 gap-2">
              {WARDROBE_CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => pickWardrobeCategory(cat)}
                  className="rounded-xl border border-line p-3.5 text-center text-sm font-medium text-ink transition-colors hover:border-blue/40"
                >
                  {WARDROBE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        ) : phase === 'wardrobeForm' ? (
          <div className="px-5 pt-2">
            <BackHeader title={editingBoard ? 'Edit wardrobe item' : 'Add wardrobe item'} onClose={close} />
            <button
              type="button"
              onClick={() => setPhase('kind')}
              className="mb-3 text-xs font-medium text-blue"
            >
              Change type
            </button>

            <div className="space-y-3">
              {imagePicker}

              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. White Button-Down"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={clsx(labelClass, 'mb-0')}>Category</label>
                  <button type="button" onClick={() => setPhase('wardrobeCategory')} className="text-xs font-medium text-blue">
                    Change
                  </button>
                </div>
                <p className="rounded-xl border border-line bg-bg-soft px-3 py-2.5 text-sm text-ink">
                  {WARDROBE_CATEGORY_LABELS[wardrobeCategory]}
                </p>
              </div>

              {subtypePresets.length > 0 && (
                <div>
                  <label className={labelClass}>Subtype (optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {subtypePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWardrobeSubtype((v) => (v === preset ? '' : preset))}
                        className={clsx(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          wardrobeSubtype === preset ? 'border-blue bg-blue-tint text-blue' : 'border-line text-ink-soft'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={clsx(inputClass, 'min-h-[60px] resize-none')}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!isValid || saving}
              onClick={() => void handleSave()}
              className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {saving ? 'Saving…' : editingBoard ? 'Save changes' : 'Add item'}
            </button>
          </div>
        ) : (
          <div className="px-5 pt-2">
            <BackHeader
              title={editingBoard ? `Edit ${VISUAL_BOARD_TYPE_META[boardType].label}` : `Add ${VISUAL_BOARD_TYPE_META[boardType].label}`}
              onClose={close}
            />
            <button type="button" onClick={() => setPhase('kind')} className="mb-3 text-xs font-medium text-blue">
              Change type
            </button>

            <div className="space-y-3">
              {imagePicker}

              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder={boardType === 'outfit' ? 'e.g. Summit outfit' : 'Board title'}
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
              onClick={() => void handleSave()}
              className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {saving ? 'Saving…' : editingBoard ? 'Save changes' : 'Add visual'}
            </button>
          </div>
        )}
      </div>
      {lightboxOpen && previewUrl && (
        <Lightbox src={previewUrl} alt="Visual board preview" onClose={() => setLightboxOpen(false)} />
      )}
    </div>,
    document.body
  )
}
