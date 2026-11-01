import type { Trip } from '../../types/trip'
import { confirmationUrl } from '../../lib/sharedConfirmations'

export function SharedConfirmations({ trip }: { trip: Trip }) {
  const shareId = trip.meta.sharedLinkId
  if (!shareId) return null
  return <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Shared confirmations">
    <h2 className="font-display text-lg text-ink">Shared confirmations</h2>
    {(trip.sharedConfirmations ?? []).length === 0 && <p className="text-xs text-ink-soft">No confirmations were included with this link.</p>}
    {(trip.sharedConfirmations ?? []).map(doc => <a key={doc.id} href={confirmationUrl(shareId, doc.id)} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-line p-3 text-sm text-blue underline">
      View {doc.title}<span className="block text-xs text-ink-soft">{doc.date} · {doc.type === 'application/pdf' ? 'PDF' : 'Image'}</span>
    </a>)}
  </section>
}
