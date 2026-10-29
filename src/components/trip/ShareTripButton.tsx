import { useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { createSharingLink, stopSharingLink } from '../../lib/revocableSharing'

export function ShareTripButton({ trip }: { trip: Trip }) {
  const links = useAppStore(s => s.ownedTripShares[trip.meta.id])
  const addLink = useAppStore(s => s.addOwnedTripShare)
  const removeLink = useAppStore(s => s.removeOwnedTripShare)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (trip.meta.sharedLinkId) return null
  async function create() {
    setBusy(true); setMessage('')
    try {
      const created = await createSharingLink(trip)
      addLink(trip.meta.id, { id: created.id, manageToken: created.manageToken, createdAt: created.createdAt, label: label.trim() || 'Shared link' })
      setLabel(''); setMessage('Link ready. Use Send link below. You can stop each link separately.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to create link.') }
    finally { setBusy(false) }
  }
  async function send(id: string) {
    const url = `${location.origin}/shared/${id}`
    try {
      if (navigator.share) await navigator.share({ title: trip.meta.name, text: `View ${trip.meta.name} in Trip OS`, url })
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setMessage('Link copied. Send it to the other traveler.') }
      else setMessage(`Copy this link: ${url}`)
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setMessage('Unable to send. Try again.') }
  }
  async function stop(id: string, token: string) {
    setBusy(true); setMessage('')
    try { await stopSharingLink(id, token); removeLink(trip.meta.id, id); setMessage('Sharing stopped for this link. Other links are unchanged.') }
    catch { setMessage('Sharing has not been stopped. Reconnect and try again.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Share trip">
    <h2 className="font-display text-lg text-ink">Share trip</h2>
    <p className="text-xs text-ink-soft">Anyone with a link can view the itinerary and booking costs until you stop sharing. Links expire 90 days after creation. Private notes, codes, photos, and wallet documents are excluded.</p>
    <label className="block text-xs text-ink-soft">Link label (optional, e.g. Maria)<input maxLength={80} value={label} onChange={e => setLabel(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink" /></label>
    <button type="button" onClick={create} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"><Share2 size={16} />{busy ? 'Working…' : 'Create sharing link'}</button>
    {(links ?? []).map(link => <div key={link.id} className="space-y-2 rounded-xl border border-line p-3">
      <p className="break-words text-sm font-medium text-ink">{link.label}</p>
      <p className="text-[11px] text-ink-soft">Expires {new Date(Date.parse(link.createdAt) + 90 * 86400000).toLocaleDateString()}</p>
      <a href={`/shared/${link.id}`} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-blue underline">Preview shared itinerary</a>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send(link.id)} className="rounded-full bg-blue px-3 py-2 text-xs text-white">Send link</button>
        <button type="button" disabled={busy} onClick={() => stop(link.id, link.manageToken)} className="rounded-full border border-line px-3 py-2 text-xs text-red">Stop sharing</button>
      </div>
    </div>)}
    <p className="text-[11px] text-ink-soft">Links show the details shared when created. Create a new link for changes. Manage access here on this device; your private backups preserve these controls. Stopping a link cannot erase screenshots or copies someone already made.</p>
    {message && <p role="status" className="break-words text-xs text-blue">{message}</p>}
  </section>
}
