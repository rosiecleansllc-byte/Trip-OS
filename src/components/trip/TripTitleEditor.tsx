import { useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'

export function TripTitleEditor({ trip }: { trip: Trip }) {
  const shareMode = useAppStore(s => s.shareMode)
  const renameTrip = useAppStore(s => s.renameTrip)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(trip.meta.name)
  const [error, setError] = useState('')
  function save(event: FormEvent) {
    event.preventDefault()
    try { renameTrip(trip.meta.id, draft); setEditing(false); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save the title.') }
  }
  if (editing && !shareMode) return <form onSubmit={save} className="space-y-2" aria-label="Edit trip title">
    <label className="block text-xs font-medium text-ink-soft">Trip title
      <input autoFocus required maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink" />
    </label>
    {error && <p role="alert" className="text-xs text-red">{error}</p>}
    <div className="flex gap-2">
      <button type="submit" className="rounded-xl bg-blue px-3 py-2 text-xs font-medium text-white">Save title</button>
      <button type="button" onClick={() => { setEditing(false); setError('') }} className="rounded-xl border border-line px-3 py-2 text-xs text-ink">Cancel</button>
    </div>
  </form>
  return <div className="flex items-start gap-2">
    <h1 className="min-w-0 flex-1 break-words font-display text-3xl text-ink">{trip.meta.name}</h1>
    {!shareMode && <button type="button" aria-label="Edit trip title" onClick={() => { setDraft(trip.meta.name); setError(''); setEditing(true) }} className="mt-1 flex shrink-0 items-center gap-1 rounded-xl border border-line px-2.5 py-2 text-xs text-blue"><Pencil size={13} /> Edit title</button>}
  </div>
}
