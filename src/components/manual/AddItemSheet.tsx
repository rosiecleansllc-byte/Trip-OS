import { useEffect, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Bed, Car, CheckCircle2, ChevronLeft, StickyNote, Ticket, UtensilsCrossed, X } from 'lucide-react'
import type { ManualItemStatus, ManualItemType, ManualTransportMode, ManualTripItem, OpenItem, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useManualItemUiStore } from '../../store/useManualItemUiStore'
import { createManualItem, findResolvableOpenItems } from '../../lib/manualItems'

const TYPE_META: Record<ManualItemType, { label: string; icon: typeof Bed; hint: string }> = {
  stay: { label: 'Stay', icon: Bed, hint: 'A hotel, rental, or place to sleep' },
  transport: { label: 'Transport', icon: Car, hint: 'A flight, drive, train, or rideshare leg' },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed, hint: 'A dining reservation' },
  activity: { label: 'Activity / Entertainment', icon: Ticket, hint: 'A show, tour, museum, or event' },
  other: { label: 'Note / Other', icon: StickyNote, hint: 'Anything else worth tracking' },
}

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
    transportMode: item.transportMode ?? 'car',
    carrier: item.carrier ?? '',
    fromLocation: item.fromLocation ?? '',
    toLocation: item.toLocation ?? '',
    partySize: item.partySize != null ? String(item.partySize) : '',
  }
}

export function AddItemSheet({ trip }: { trip: Trip }) {
  const step = useManualItemUiStore((s) => s.step)
  const type = useManualItemUiStore((s) => s.type)
  const editingItem = useManualItemUiStore((s) => s.editingItem)
  const pickType = useManualItemUiStore((s) => s.pickType)
  const openPicker = useManualItemUiStore((s) => s.openPicker)
  const close = useManualItemUiStore((s) => s.close)

  const addManualItem = useAppStore((s) => s.addManualItem)
  const updateManualItem = useAppStore((s) => s.updateManualItem)
  const resolveOpenItem = useAppStore((s) => s.resolveOpenItem)

  const [form, setForm] = useState<FormState>(() => emptyForm(trip))
  const [resolveCandidates, setResolveCandidates] = useState<OpenItem[] | null>(null)

  useEffect(() => {
    if (step !== 'form') return
    setForm(editingItem ? formFromItem(editingItem) : emptyForm(trip))
    setResolveCandidates(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editingItem])

  if (step === 'closed') return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = () => {
    if (!type) return
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
      transportMode: type === 'transport' ? form.transportMode : undefined,
      carrier: type === 'transport' ? form.carrier.trim() || undefined : undefined,
      fromLocation: type === 'transport' ? form.fromLocation.trim() : undefined,
      toLocation: type === 'transport' ? form.toLocation.trim() : undefined,
      partySize: type === 'restaurant' && form.partySize.trim() ? Number(form.partySize) : undefined,
    }

    let saved: ManualTripItem
    if (editingItem) {
      updateManualItem(editingItem.id, base)
      saved = { ...editingItem, ...base }
    } else {
      saved = createManualItem(base)
      addManualItem(saved)
    }

    const candidates = findResolvableOpenItems(trip, saved)
    if (candidates.length > 0) {
      setResolveCandidates(candidates)
    } else {
      close()
    }
  }

  const isValid =
    type === 'transport'
      ? form.fromLocation.trim() && form.toLocation.trim() && form.date
      : form.title.trim() && form.date

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={close}
      />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />

        {resolveCandidates ? (
          <div className="px-5 pt-2">
            <div className="flex items-center gap-2 text-blue">
              <CheckCircle2 size={18} />
              <p className="font-display text-lg text-ink">Saved</p>
            </div>
            <p className="mt-2 text-sm text-ink-soft">This looks like it covers:</p>
            <div className="mt-2 space-y-2">
              {resolveCandidates.map((oi) => (
                <div key={oi.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <span className="text-sm text-ink">{oi.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      resolveOpenItem(trip.meta.id, oi.id)
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
                    onClick={() => pickType(t)}
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
        ) : (
          type && (
            <div className="px-5 pt-2">
              <div className="mb-3 flex items-center gap-2">
                <button
                  aria-label="Back"
                  onClick={editingItem ? close : openPicker}
                  className="text-ink-soft"
                >
                  <ChevronLeft size={20} />
                </button>
                <p className="font-display text-lg text-ink">
                  {editingItem ? `Edit ${TYPE_META[type].label}` : `Add ${TYPE_META[type].label}`}
                </p>
              </div>

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

                <Field label="Notes">
                  <textarea className={clsx(inputClass, 'min-h-[72px] resize-none')} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
                </Field>
              </div>

              <button
                type="button"
                disabled={!isValid}
                onClick={handleSave}
                className="mt-5 w-full rounded-full bg-blue py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {editingItem ? 'Save changes' : 'Add to trip'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
