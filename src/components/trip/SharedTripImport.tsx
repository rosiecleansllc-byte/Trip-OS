import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { readSharingLink, sharedViewId } from '../../lib/revocableSharing'
import { defaultTripId } from '../../data/tripsIndex'

export function SharedTripImport() {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const shares = useAppStore(s => s.receivedTripShares)
  const hide = useAppStore(s => s.hideReceivedTripShare)
  function openLink() {
    try {
      const url = new URL(link)
      if (url.origin !== location.origin || !/^\/shared\/[a-f0-9-]{36}$/.test(url.pathname)) throw new Error()
      navigate(url.pathname)
    } catch { setError('Paste a trip-sharing link. The app’s home address does not include another person’s trip; ask them to create a sharing link.') }
  }
  function open(id: string) { const state = useAppStore.getState(); state.setCurrentTripId(sharedViewId(id)); state.setShareMode(true); navigate('/overview') }
  function hideTrip(id: string) {
    hide(id)
    const state = useAppStore.getState()
    if (state.currentTripId === sharedViewId(id)) { state.setCurrentTripId(defaultTripId); state.setShareMode(false) }
  }
  return <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Shared trips">
    <h2 className="font-display text-lg text-ink">Shared with you</h2>
    <label className="block text-xs text-ink-soft">Trip-sharing link<input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="Paste the other traveler’s link" className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink" /></label>
    <button type="button" onClick={openLink} className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-blue">Open shared trip</button>
    {error && <p role="alert" className="text-xs text-red">{error}</p>}
    {Object.values(shares).map(share => <div key={share.id} className="space-y-2 rounded-xl border border-line p-3">
      <button type="button" onClick={() => open(share.id)} className="block break-words text-left text-sm font-medium text-blue">{share.name}</button>
      <p className="text-xs text-ink-soft">{share.destination}</p>
      <button type="button" onClick={() => hideTrip(share.id)} className="text-xs text-ink-soft underline">Hide shared trip</button>
    </div>)}
    <p className="text-[11px] text-ink-soft">Hiding removes it from your list. It does not stop anyone from seeing your trips. Use Stop sharing on your own trip to end access.</p>
  </section>
}
export function SharedTripPage() {
  const { shareId } = useParams()
  const [result, setResult] = useState<{ id: string; trip?: Trip; error?: string }>()
  const navigate = useNavigate()
  useEffect(() => {
    if (!shareId) return
    const controller = new AbortController()
    readSharingLink(shareId, controller.signal).then(trip => setResult({ id: shareId, trip })).catch(e => { if (!controller.signal.aborted) setResult({ id: shareId, error: e instanceof Error ? e.message : 'Unable to open trip.' }) })
    return () => controller.abort()
  }, [shareId])
  const current = result?.id === shareId ? result : undefined
  function open() {
    const trip = current?.trip
    if (!shareId || !trip) return
    const state = useAppStore.getState()
    state.rememberReceivedTripShare({ id: shareId, name: trip.meta.name, destination: trip.meta.destinationLabel })
    state.setCurrentTripId(sharedViewId(shareId)); state.setShareMode(true); navigate('/overview')
  }
  return <div className="mx-auto min-h-dvh max-w-md space-y-4 bg-bg px-4 py-8">
    <h1 className="font-display text-2xl text-ink">A trip shared with you</h1>
    {!shareId ? <p className="text-sm text-ink-soft">This old link does not contain a trip. Ask the sender to create a new sharing link from their trip overview.</p> : current?.error ? <p role="alert" className="text-sm text-red">{current.error}</p> : !current?.trip ? <p role="status">Verifying access…</p> : <div className="space-y-3 rounded-2xl border border-line p-4">
      <h2 className="break-words font-display text-xl">{current.trip.meta.name}</h2>
      <p className="text-sm text-ink-soft">{current.trip.meta.destinationLabel} · {current.trip.meta.startDate} – {current.trip.meta.endDate}</p>
      <p className="text-xs text-ink-soft">Read-only shared itinerary. The owner can end access. An internet connection is required to verify access.</p>
      <button type="button" onClick={open} className="rounded-xl bg-blue px-4 py-2.5 text-sm text-white">View shared itinerary</button>
    </div>}
    <Link to="/" className="inline-block text-sm text-blue underline">Your trips</Link>
  </div>
}
