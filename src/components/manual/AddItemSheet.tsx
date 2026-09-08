import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  AlertTriangle,
  Bed,
  Car,
  CheckCircle2,
  ChevronLeft,
  Keyboard,
  Loader2,
  Sparkles,
  StickyNote,
  Ticket,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import type { ManualItemStatus, ManualItemType, ManualTransportMode, ManualTripItem, OpenItem, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useManualItemUiStore } from '../../store/useManualItemUiStore'
import { createManualItem, findManualItemsForOpenItem, findOpenItemsToUnresolve, findResolvableOpenItems } from '../../lib/manualItems'
import { OCR_MIN_CONFIDENCE, recognizeImage } from '../../lib/ocr'
import { parseFieldsForType, type ParsedFields } from '../../lib/ocrParse'
import { putPrivateDoc } from '../../lib/privateDocs'
import { Lightbox } from '../ui/Lightbox'

const TYPE_META: Record<ManualItemType, { label: string; icon: typeof Bed; hint: string }> = {
  stay: { label: 'Stay', icon: Bed, hint: 'A hotel, rental, or place to sleep' },
  transport: { label: 'Transport', icon: Car, hint: 'A flight, drive, train, or rideshare leg' },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed, hint: 'A dining reservation' },
  activity: { label: 'Activity / Entertainment', icon: Ticket, hint: 'A show, tour, museum, or event' },
  other: { label: 'Note / Other', icon: StickyNote, hint: 'Anything else worth tracking' },
}

// Types that can be filled in from an uploaded screenshot. Note/Other has
// no confirmation-shaped source document, so it stays manual-only and
// skips the upload-vs-manual chooser entirely (see useManualItemUiStore
// pickType).
const UPLOADABLE_TYPES = new Set<ManualItemType>(['stay', 'transport', 'restaurant', 'activity'])

const TRANSPORT_MODES: ManualTransportMode[] = ['car', 'rental-car', 'rideshare', 'train', 'bus', 'flight', 'other']
const TRANSPORT_MODE_LABEL: Record<ManualTransportMode, string> = {
  car: 'Car',
  'rental-car': 'Rental car',
  rideshare: 'Rideshare',
  train: 'Train',
  bus: 'Bus',
  flight: 'Flight',
  other: 'Other',
}
const STATUSES: ManualItemStatus[] = ['planned', 'confirmed', 'paid']
const STATUS_LABEL: Record<ManualItemStatus, string> = { planned: 'Planned', confirmed: 'Confirmed', paid: 'Paid' }

const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-gray focus:border-blue/50 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-ink-soft'

function Field({ label, children, half }: { label: string; children: ReactNode; half?: boolean }) {
  return (
    <div className={half ? 'w-1/2' : 'w-full'}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

interface FormState {
  title: string
  date: string
  endDate: string
  time: string
  endTime: string
  location: string
  address: string
  phone: string
  websiteUrl: string
  reservationUrl: string
  notes: string
  status: ManualItemStatus
  cost: string
  currency: string
  confirmationCode: string
  transportMode: ManualTransportMode
  carrier: string
  fromLocation: string
  toLocation: string
  partySize: string
}

function emptyForm(trip: Trip): FormState {
  return {
    title: '',
    date: trip.meta.startDate,
    endDate: '',
    time: '',
    endTime: '',
    location: '',
    address: '',
    phone: '',
    websiteUrl: '',
    reservationUrl: '',
    notes: '',
    status: 'planned',
    cost: '',
    currency: trip.meta.tripCurrency,
    confirmationCode: '',
    transportMode: 'car',
    carrier: '',
    fromLocation: '',
    toLocation: '',
    partySize: '',
  }
}

function formFromItem(item: ManualTripItem): FormState {
  return {
    title: item.title,
    date: item.date,
    endDate: item.endDate ?? '',
    time: item.time ?? '',
    endTime: item.endTime ?? '',
    location: item.location ?? '',
    address: item.address ?? '',
    phone: item.phone ?? '',
    websiteUrl: item.websiteUrl ?? '',
    reservationUrl: item.reservationUrl ?? '',
    notes: item.notes ?? '',
    status: item.status,
    cost: item.cost != null ? String(item.cost) : '',
    currency: item.currency ?? 'USD',
    confirmationCode: item.confirmationCode ?? '',
    transportMode: item.transportMode ?? 'car',
    carrier: item.carrier ?? '',
    fromLocation: item.fromLocation ?? '',
    toLocation: item.toLocation ?? '',
    partySize: item.partySize != null ? String(item.partySize) : '',
  }
}

// OCR only fills fields the parser is confident about — every ParsedFields
// value is either a real match from the text or absent, never guessed —
// so merging it over an empty form leaves everything else at its normal
// blank state rather than showing fabricated data.
function formFromParsed(trip: Trip, parsed: ParsedFields): FormState {
  const base = emptyForm(trip)
  const merged: FormState = { ...base }
  for (const key of Object.keys(parsed) as (keyof ParsedFields)[]) {
    const value = parsed[key]
    if (value === undefined) continue
    ;(merged as unknown as Record<string, string>)[key] = value
  }
  return merged
}

export function AddItemSheet({ trip }: { trip: Trip }) {
  const step = useManualItemUiStore((s) => s.step)
  const type = useManualItemUiStore((s) => s.type)
  const editingItem = useManualItemUiStore((s) => s.editingItem)
  const pickType = useManualItemUiStore((s) => s.pickType)
  const openPicker = useManualItemUiStore((s) => s.openPicker)
  const startReading = useManualItemUiStore((s) => s.startReading)
  const enterForm = useManualItemUiStore((s) => s.enterForm)
  const close = useManualItemUiStore((s) => s.close)

  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const addManualItem = useAppStore((s) => s.addManualItem)
  const updateManualItem = useAppStore((s) => s.updateManualItem)
  const resolveOpenItem = useAppStore((s) => s.resolveOpenItem)
  const unresolveOpenItem = useAppStore((s) => s.unresolveOpenItem)

  const [form, setForm] = useState<FormState>(() => emptyForm(trip))
  const [resolveCandidates, setResolveCandidates] = useState<OpenItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  // Set only when the item itself saved fine but writing its screenshot
  // into the private-document wallet failed (see handleSave) — the
  // traveler needs to know the photo didn't attach, not just see the
  // sheet close as if everything worked.
  const [screenshotError, setScreenshotError] = useState<string | null>(null)

  // The uploaded screenshot lives only here — component state, never the
  // persisted app store — until Save writes it into the private-document
  // IndexedDB wallet under the item's own privateDocumentKey (see
  // handleSave). If the sheet is closed without saving, it's simply
  // discarded along with everything else in this component.
  const [pendingScreenshot, setPendingScreenshotState] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [ocrNotice, setOcrNotice] = useState<'filled' | 'failed' | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Object URLs are created/revoked right in the event that changes the
  // screenshot (upload, replace, remove, reset) rather than reactively in
  // an effect — same outcome, but it's the change itself driving the
  // update instead of a second render reacting to state a first render
  // just set. previewUrlRef exists only so an unmount can revoke whatever
  // URL is still outstanding.
  const setPendingScreenshot = (file: File | null) => {
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
    setPendingScreenshotState(file)
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  // Only the "editing an existing item" entry into the form needs to be
  // effect-driven (openEdit is called from outside this component, by a
  // card's ••• menu). Every other entry into 'form' — a fresh manual
  // entry, or the result of OCR — explicitly sets `form`/`pendingScreenshot`
  // itself right before the step changes, so this never clobbers those.
  useEffect(() => {
    if (step === 'form' && editingItem) {
      setForm(formFromItem(editingItem))
      setPendingScreenshot(null)
      setOcrNotice(null)
      setResolveCandidates(null)
      setScreenshotError(null)
    }
  }, [step, editingItem])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const startFreshEntry = (t: ManualItemType) => {
    setForm(emptyForm(trip))
    setPendingScreenshot(null)
    setOcrNotice(null)
    setResolveCandidates(null)
    setScreenshotError(null)
    pickType(t)
  }

  const handleEnterManually = () => {
    setForm(emptyForm(trip))
    setPendingScreenshot(null)
    setOcrNotice(null)
    setScreenshotError(null)
    enterForm()
  }

  const runOcr = async (file: File) => {
    if (!type) return
    setOcrProgress(0)
    try {
      const { text, confidence } = await recognizeImage(file, (p) => setOcrProgress(p.progress))
      // A low confidence score means Tesseract technically ran without
      // throwing, but what it produced is effectively noise (see
      // OCR_MIN_CONFIDENCE) — treated the same as a thrown error so the
      // traveler never sees field values that just look plausible but
      // were actually read off static/artifacts rather than real text.
      if (confidence < OCR_MIN_CONFIDENCE || !text.trim()) {
        setForm(emptyForm(trip))
        setOcrNotice('failed')
        return
      }
      const parsed = parseFieldsForType(type, text, trip.meta.startDate)
      setForm(formFromParsed(trip, parsed))
      setOcrNotice('filled')
    } catch {
      // Never block the traveler: keep the screenshot attached, open the
      // normal (empty) form, and let them fill in anything OCR couldn't
      // read — this is the same recovery path whether OCR genuinely
      // failed to run or just couldn't extract anything useful.
      setForm(emptyForm(trip))
      setOcrNotice('failed')
    } finally {
      enterForm()
    }
  }

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingScreenshot(file)
    startReading()
    void runOcr(file)
  }

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // A replacement swaps the attached image only — it doesn't re-run OCR
    // or touch anything the traveler has already reviewed/edited in the
    // form, so a prior "filled from screenshot" banner no longer applies.
    setPendingScreenshot(file)
    setOcrNotice(null)
  }

  const handleSave = async () => {
    if (!type) return
    setSaving(true)
    const base = {
      tripId: trip.meta.id,
      type,
      title: type === 'transport' ? `${form.fromLocation || '?'} → ${form.toLocation || '?'}` : form.title.trim(),
      date: form.date,
      endDate: form.endDate || undefined,
      time: form.time || undefined,
      endTime: form.endTime || undefined,
      location: form.location.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
      reservationUrl: form.reservationUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
      cost: form.cost.trim() ? Number(form.cost) : undefined,
      currency: form.cost.trim() ? form.currency : undefined,
      confirmationCode: form.confirmationCode.trim() || undefined,
      transportMode: type === 'transport' ? form.transportMode : undefined,
      carrier: type === 'transport' ? form.carrier.trim() || undefined : undefined,
      fromLocation: type === 'transport' ? form.fromLocation.trim() : undefined,
      toLocation: type === 'transport' ? form.toLocation.trim() : undefined,
      partySize: (type === 'restaurant' || type === 'activity') && form.partySize.trim() ? Number(form.partySize) : undefined,
    }

    let saved: ManualTripItem
    // Tracks resolvedOpenItemIds as-of-this-save — the store update from
    // unresolveOpenItem below won't be reflected in the resolvedOpenItemIds
    // read at the top of this render, so candidates are filtered against
    // this local copy instead of the (now stale) closed-over one.
    const effectiveResolvedIds = { ...resolvedOpenItemIds }
    let nextManualItems: ManualTripItem[]

    if (editingItem) {
      updateManualItem(editingItem.id, base)
      saved = { ...editingItem, ...base }
      // The edit may have changed the date/route enough that this item no
      // longer covers an OpenItem it previously justified resolving —
      // reconcile against the list with the edit already applied and flip
      // anything now-unjustified back to open.
      nextManualItems = manualItems.map((i) => (i.id === saved.id ? saved : i))
      for (const openItemId of findOpenItemsToUnresolve(trip, nextManualItems, resolvedOpenItemIds)) {
        unresolveOpenItem(trip.meta.id, openItemId)
        delete effectiveResolvedIds[`${trip.meta.id}:${openItemId}`]
      }
    } else {
      saved = createManualItem(base)
      addManualItem(saved)
      nextManualItems = [...manualItems, saved]
    }

    // The screenshot only ever gets written to the private-document
    // wallet once the item (and therefore its generated
    // privateDocumentKey) exists — see the class comment in
    // lib/manualItems.ts createManualItem. Held in memory until now,
    // never in localStorage/Zustand persisted state.
    //
    // The item itself is already fully saved above regardless of what
    // happens here — a failure here never leaves it half-saved, only
    // without its attached photo — so this is wrapped separately: the
    // traveler still gets a completed save and a clear, recoverable
    // message (the item's own ••• menu / ActionRow "Add" button is right
    // there to attach the photo again), instead of the sheet hanging on
    // "Saving…" or silently closing as if the photo made it in.
    let screenshotErrorMessage: string | null = null
    if (pendingScreenshot && saved.privateDocumentKey) {
      try {
        await putPrivateDoc(saved.privateDocumentKey, pendingScreenshot)
      } catch {
        screenshotErrorMessage = "Saved, but the screenshot couldn't be attached. You can add it again from this item's card."
      }
    }
    setPendingScreenshot(null)
    setScreenshotError(screenshotErrorMessage)

    // Only offer to resolve OpenItems that aren't already resolved.
    const candidates = findResolvableOpenItems(trip, nextManualItems, saved).filter(
      (oi) => !effectiveResolvedIds[`${trip.meta.id}:${oi.id}`]
    )
    setSaving(false)
    if (candidates.length > 0 || screenshotErrorMessage) {
      setResolveCandidates(candidates)
    } else {
      close()
    }
  }

  const isValid =
    type === 'transport'
      ? form.fromLocation.trim() && form.toLocation.trim() && form.date
      : form.title.trim() && form.date

  const hiddenFileInputs = (
    <>
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFileChange} />
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceFileChange} />
    </>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={close}
      />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        {hiddenFileInputs}

        {resolveCandidates ? (
          <div className="px-5 pt-2">
            <div className="flex items-center gap-2 text-blue">
              <CheckCircle2 size={18} />
              <p className="font-display text-lg text-ink">Saved</p>
            </div>
            {screenshotError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-tint px-3.5 py-2.5 text-xs text-red">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <p>{screenshotError}</p>
              </div>
            )}
            {resolveCandidates.length > 0 && (
              <p className="mt-3 text-sm text-ink-soft">This looks like it covers:</p>
            )}
            <div className="mt-2 space-y-2">
              {resolveCandidates.map((oi) => (
                <div key={oi.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <span className="text-sm text-ink">{oi.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      resolveOpenItem(trip.meta.id, oi.id)
                      // Record the relationship explicitly for every
                      // qualifying manual item (see lib/manualItems.ts
                      // findOpenItemsToUnresolve), not just the one just
                      // saved — a round-trip OpenItem needs both legs
                      // linked so deleting or editing either one can
                      // reopen it if nothing else still covers it.
                      findManualItemsForOpenItem(trip, manualItems, oi).forEach((mi) =>
                        updateManualItem(mi.id, { relatedOpenItemId: oi.id })
                      )
                      setResolveCandidates((c) => (c ? c.filter((x) => x.id !== oi.id) : c))
                    }}
                    className="shrink-0 rounded-full bg-blue px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Mark resolved
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-soft"
            >
              Done
            </button>
          </div>
        ) : step === 'picker' ? (
          <div className="px-5 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-ink">Add to trip</p>
              <button aria-label="Close" onClick={close} className="text-ink-soft">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {(Object.keys(TYPE_META) as ManualItemType[]).map((t) => {
                const meta = TYPE_META[t]
                const Icon = meta.icon
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => startFreshEntry(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-blue/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-tint text-blue">
                      <Icon size={17} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{meta.label}</span>
                      <span className="block text-xs text-ink-soft">{meta.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : step === 'method' ? (
          type && (
            <div className="px-5 pt-2">
              <div className="mb-1 flex items-center gap-2">
                <button aria-label="Back" onClick={openPicker} className="text-ink-soft">
                  <ChevronLeft size={20} />
                </button>
                <p className="font-display text-lg text-ink">Add {TYPE_META[type].label}</p>
              </div>
              <p className="mb-4 pl-8 text-xs text-ink-soft">How do you want to add this?</p>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-blue bg-blue-tint p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue text-white">
                    <Upload size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Upload confirmation</span>
                    <span className="block text-xs text-ink-soft">Use a screenshot or image to fill this in</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleEnterManually}
                  className="flex w-full items-center gap-3 rounded-xl border border-line p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-soft text-ink-soft">
                    <Keyboard size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">Enter manually</span>
                    <span className="block text-xs text-ink-soft">Type the details yourself</span>
                  </span>
                </button>
              </div>
            </div>
          )
        ) : step === 'reading' ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <Loader2 size={30} className="animate-spin text-blue" />
            <p className="font-display text-lg text-ink">Reading confirmation…</p>
            <p className="text-xs text-ink-soft">{Math.round(ocrProgress * 100)}%</p>
          </div>
        ) : (
          type && (
            <div className="px-5 pt-2">
              <div className="mb-3 flex items-center gap-2">
                <button
                  aria-label="Back"
                  onClick={editingItem ? close : UPLOADABLE_TYPES.has(type) ? () => pickType(type) : openPicker}
                  className="text-ink-soft"
                >
                  <ChevronLeft size={20} />
                </button>
                <p className="font-display text-lg text-ink">
                  {editingItem ? `Edit ${TYPE_META[type].label}` : `Add ${TYPE_META[type].label}`}
                </p>
              </div>

              {ocrNotice === 'filled' && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-blue-tint px-3.5 py-2.5 text-xs text-blue">
                  <Sparkles size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Details filled from screenshot</p>
                    <p className="text-blue/80">Review before saving</p>
                  </div>
                </div>
              )}
              {ocrNotice === 'failed' && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-tint px-3.5 py-2.5 text-xs text-red">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <p>We couldn&apos;t read everything — fill in anything missing</p>
                </div>
              )}
              {pendingScreenshot && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-line p-2.5">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Preview attached confirmation"
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-soft"
                  >
                    {previewUrl && <img src={previewUrl} alt="" className="h-full w-full object-cover" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink">Confirmation attached</p>
                    <p className="truncate text-[11px] text-ink-soft">{pendingScreenshot.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => replaceInputRef.current?.click()}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-blue"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingScreenshot(null)
                        setOcrNotice(null)
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-red"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {type === 'transport' ? (
                  <>
                    <div className="flex gap-3">
                      <Field label="From" half>
                        <input className={inputClass} value={form.fromLocation} onChange={(e) => set('fromLocation', e.target.value)} placeholder="Austin" />
                      </Field>
                      <Field label="To" half>
                        <input className={inputClass} value={form.toLocation} onChange={(e) => set('toLocation', e.target.value)} placeholder="Waco" />
                      </Field>
                    </div>
                    <Field label="Date">
                      <input type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} />
                    </Field>
                    <div className="flex gap-3">
                      <Field label="Departure time" half>
                        <input type="time" className={inputClass} value={form.time} onChange={(e) => set('time', e.target.value)} />
                      </Field>
                      <Field label="Arrival time" half>
                        <input type="time" className={inputClass} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Mode">
                      <select className={inputClass} value={form.transportMode} onChange={(e) => set('transportMode', e.target.value as ManualTransportMode)}>
                        {TRANSPORT_MODES.map((m) => (
                          <option key={m} value={m}>{TRANSPORT_MODE_LABEL[m]}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Provider / carrier">
                      <input className={inputClass} value={form.carrier} onChange={(e) => set('carrier', e.target.value)} placeholder="Optional" />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={type === 'stay' ? 'Hotel / stay name' : type === 'restaurant' ? 'Restaurant name' : type === 'activity' ? 'Activity / event name' : 'Title'}>
                      <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
                    </Field>
                    <div className="flex gap-3">
                      <Field label={type === 'stay' ? 'Check-in date' : 'Date'} half>
                        <input type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} />
                      </Field>
                      {type === 'stay' ? (
                        <Field label="Check-out date" half>
                          <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
                        </Field>
                      ) : (
                        <Field label={type === 'activity' ? 'Start time' : 'Time'} half>
                          <input type="time" className={inputClass} value={form.time} onChange={(e) => set('time', e.target.value)} />
                        </Field>
                      )}
                    </div>
                    {type === 'stay' && (
                      <Field label="Check-in time">
                        <input type="time" className={inputClass} value={form.time} onChange={(e) => set('time', e.target.value)} />
                      </Field>
                    )}
                    {type === 'activity' && (
                      <Field label="End time">
                        <input type="time" className={inputClass} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
                      </Field>
                    )}
                    {type === 'activity' && (
                      <Field label="Venue / location">
                        <input className={inputClass} value={form.location} onChange={(e) => set('location', e.target.value)} />
                      </Field>
                    )}
                    {type === 'restaurant' && (
                      <Field label="Party size">
                        <input type="number" min="1" className={inputClass} value={form.partySize} onChange={(e) => set('partySize', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                    {type === 'activity' && (
                      <Field label="Tickets">
                        <input type="number" min="1" className={inputClass} value={form.partySize} onChange={(e) => set('partySize', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                    {type !== 'other' && (
                      <Field label="Address">
                        <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                    {type !== 'other' && (
                      <Field label="Phone">
                        <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                    {type !== 'other' && (
                      <Field label="Website">
                        <input type="url" className={inputClass} value={form.websiteUrl} onChange={(e) => set('websiteUrl', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                    {type === 'restaurant' && (
                      <Field label="Reservation link">
                        <input type="url" className={inputClass} value={form.reservationUrl} onChange={(e) => set('reservationUrl', e.target.value)} placeholder="Optional" />
                      </Field>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <Field label="Cost" half>
                    <input type="number" min="0" step="0.01" className={inputClass} value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Status" half>
                    <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as ManualItemStatus)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {type !== 'other' && (
                  <Field label="Confirmation code">
                    <input className={inputClass} value={form.confirmationCode} onChange={(e) => set('confirmationCode', e.target.value)} placeholder="Optional — kept private, hidden in Share mode" />
                  </Field>
                )}

                <Field label="Notes">
                  <textarea className={clsx(inputClass, 'min-h-[72px] resize-none')} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
                </Field>
              </div>

              <button
                type="button"
                disabled={!isValid || saving}
                onClick={handleSave}
                className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {saving ? 'Saving…' : editingItem ? 'Save changes' : 'Add to trip'}
              </button>
            </div>
          )
        )}
      </div>
      {lightboxOpen && previewUrl && (
        <Lightbox src={previewUrl} alt="Attached confirmation" onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
