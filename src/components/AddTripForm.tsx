import { useState, type FormEvent } from 'react'
import { createTrip, type NewTripInput } from '../lib/createTrip'
import type { Trip } from '../types/trip'

const inputClass = 'mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink'

export function AddTripForm({ onCreate, onCancel }: { onCreate: (trip: Trip) => void; onCancel: () => void }) {
  const [input, setInput] = useState<NewTripInput>({ name: '', destination: '', startDate: '', endDate: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, currency: 'USD', travelers: '' })
  const [error, setError] = useState('')
  const field = (key: keyof NewTripInput, value: string) => setInput(s => ({ ...s, [key]: value }))
  function submit(event: FormEvent) {
    event.preventDefault()
    try { onCreate(createTrip(input)) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create trip. Please try again.') }
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Add trip">
      <h2 className="font-display text-xl text-ink">Add a trip</h2>
      <label className="block text-xs text-ink-soft">Trip name<input autoFocus required maxLength={100} className={inputClass} value={input.name} onChange={e => field('name', e.target.value)} placeholder="My next adventure" /></label>
      <label className="block text-xs text-ink-soft">Destination<input required maxLength={150} className={inputClass} value={input.destination} onChange={e => field('destination', e.target.value)} placeholder="City, country" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 text-xs text-ink-soft">Start date<input required type="date" className={inputClass} value={input.startDate} onChange={e => field('startDate', e.target.value)} /></label>
        <label className="block min-w-0 text-xs text-ink-soft">End date<input required type="date" min={input.startDate || undefined} className={inputClass} value={input.endDate} onChange={e => field('endDate', e.target.value)} /></label>
      </div>
      <label className="block text-xs text-ink-soft">Travelers (separate names with commas)<input maxLength={500} className={inputClass} value={input.travelers} onChange={e => field('travelers', e.target.value)} placeholder="Cecilia, Blake" /></label>
      <label className="block text-xs text-ink-soft">Destination time zone<input required className={inputClass} value={input.timeZone} onChange={e => field('timeZone', e.target.value.trim())} placeholder="America/Lima" /></label>
      <label className="block text-xs text-ink-soft">Trip currency<input required maxLength={3} pattern="[A-Z]{3}" className={inputClass} value={input.currency} onChange={e => field('currency', e.target.value.toUpperCase())} placeholder="PEN" /></label>
      <p className="text-xs text-ink-soft">Saved on this device. Export a backup to move your trips to another browser or device.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="rounded-xl bg-blue px-4 py-2.5 text-sm font-medium text-white">Create trip</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink">Cancel</button>
      </div>
    </form>
  )
}
