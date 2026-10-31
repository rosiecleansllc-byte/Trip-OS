import { useRef, useState } from 'react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { createManualItem, getEffectiveTrip } from '../../lib/manualItems'
import { draftToInput, itineraryKey, parseItinerary, validateItineraryRow, type ItineraryDraft } from '../../lib/itineraryImport'
import { readItineraryFile } from '../../lib/readItinerary'
const field = 'w-full rounded-lg border border-line bg-bg p-2 text-sm'
export function ImportItinerary({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [text, setText] = useState(''), [rows, setRows] = useState<ItineraryDraft[]>([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  function review(value: string) {
    try { const next = parseItinerary(value, trip.meta.startDate); setRows(next); setMessage(next.length ? `${next.length} entries found. Review before adding.` : 'No dated entries found. Use a date heading (e.g. NOV 9, 2026), a section (e.g. ACTIVITIES), then one event per line.') } catch (error) { setMessage((error as Error).message) }
  }
  function change(i: number, patch: Partial<ItineraryDraft>) { setRows(all => all.map((row, j) => i === j ? { ...row, ...patch } : row)) }
  function save() {
    const selected = rows.filter(row => row.selected)
    try {
      if (!selected.length || selected.some(row => !validateItineraryRow(row))) { setMessage('Select entries and check each title, date and time.'); return }
      const store = useAppStore.getState()
      const effective = getEffectiveTrip(trip, store.manualItems, store.resolvedOpenItemIds)
      const keys = new Set([...effective.bookings.map(item => ({ title: item.name, date: item.dateStart })), ...store.manualItems.filter(item => item.tripId === trip.meta.id)].map(item => itineraryKey({ date: item.date, title: item.title })))
      const additions = selected.filter(row => { const key = itineraryKey(row); if (keys.has(key)) return false; keys.add(key); return true }).map(row => createManualItem(draftToInput(row, trip.meta.id)))
      useAppStore.setState(s => ({ manualItems: [...s.manualItems, ...additions] }))
      setRows([]); setText(''); setMessage(`Added ${additions.length} planned entries. Skipped ${selected.length - additions.length} matching entries. You can edit them from Bookings.`)
    } catch { setMessage('Could not import. Check the dates and available device storage, then try again.') }
  }
  return <div role="dialog" aria-modal="true" aria-label="Import itinerary" className="fixed inset-0 z-[70] flex flex-col bg-bg p-4">
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3">
      <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Import itinerary</h2><button onClick={onClose} className="p-2 text-blue">Close</button></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-8">
        <p className="text-sm text-ink-soft">Import a text-based PDF or .txt itinerary with date headings. Review every entry. Plans stay on this device; nothing is booked or marked paid.</p>
        <input ref={input} aria-label="Itinerary file" type="file" accept="application/pdf,text/plain,.pdf,.txt" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setBusy(true); setMessage('Reading itinerary…'); try { const value = await readItineraryFile(file); setText(value); review(value) } catch(error) { setMessage(error instanceof TypeError ? 'The PDF reader could not finish. Try pasting the itinerary text while we check compatibility.' : (error as Error).message) } finally { setBusy(false) } }} />
        <label className="block text-sm">Or paste itinerary text<textarea className={field} rows={4} value={text} onChange={event => setText(event.target.value)} /></label>
        <button disabled={busy || !text.trim()} onClick={() => review(text)} className="rounded-xl border border-line px-3 py-2 text-blue">Review entries</button>
        {message && <p role="status" className="text-sm text-blue">{message}</p>}
        {rows.length > 0 && <><p className="text-xs text-ink-soft">Alternatives and undecided venues start unchecked. Dates use the trip year when omitted. Check for similar bookings with different names to avoid duplicates.</p><div className="flex gap-3"><button onClick={() => setRows(all => all.map(row => ({ ...row, selected: true })))}>Select all</button><button onClick={() => setRows(all => all.map(row => ({ ...row, selected: false })))}>Deselect all</button></div></>}
        {rows.map((row, i) => <div key={i} className="space-y-2 rounded-xl border border-line p-3">
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={row.selected} onChange={event => change(i, { selected: event.target.checked })} />Include entry {i + 1}</label>
          <label className="block text-xs">Title<input className={field} value={row.title} onChange={event => change(i, { title: event.target.value })} /></label>
          <div className="flex gap-2"><label className="min-w-0 flex-1 text-xs">Date<input className={field} type="date" value={row.date} onChange={event => change(i, { date: event.target.value })} /></label><label className="min-w-0 flex-1 text-xs">Time (optional)<input className={field} type="time" value={row.time} onChange={event => change(i, { time: event.target.value })} /></label></div>
          {(row.date < trip.meta.startDate || row.date > trip.meta.endDate) && <p className="text-xs text-red">Outside this trip’s dates—check before including.</p>}
          <label className="block text-xs">Type<select className={field} value={row.type} onChange={event => change(i, { type: event.target.value as ItineraryDraft['type'] })}><option value="activity">Activity</option><option value="restaurant">Restaurant</option><option value="other">Note</option></select></label>
          <label className="block text-xs">Notes / travelers<textarea className={field} value={row.notes} onChange={event => change(i, { notes: event.target.value })} /></label>
        </div>)}
      </div>
      {rows.length > 0 && <button disabled={busy} onClick={save} className="rounded-xl bg-blue p-3 text-white">Add {rows.filter(row => row.selected).length} selected entries to {trip.meta.name}</button>}
    </div>
  </div>
}
