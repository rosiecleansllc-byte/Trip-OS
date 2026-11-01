import { CheckCircle2, Circle } from 'lucide-react'
import type { OpenItem, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'

// The single tappable control behind every "Still open"/"Still needed"
// row across Bookings and Today — turns an OpenItem into a real checklist
// item instead of an informational row. Persists purely through the
// existing resolvedOpenItemIds store (see useAppStore), so Bookings'
// "Still open" list, Today's readiness card, and any other page all read
// the same state with no separate checklist system.
//
// Checking this control is an explicit decision, independent of any booking.
// Booking-linked suggestions in AddItemSheet retain their own reconciliation.
export function OpenItemToggle({
  trip,
  item,
  size = 18,
}: {
  trip: Trip
  item: OpenItem
  size?: number
}) {
  const shareMode = useAppStore((s) => s.shareMode)
  const resolveOpenItem = useAppStore((s) => s.resolveOpenItem)
  const unresolveOpenItem = useAppStore((s) => s.unresolveOpenItem)

  const resolved = item.status === 'done'
  const Icon = resolved ? CheckCircle2 : Circle
  const colorClass = resolved ? 'text-blue' : item.priority === 'high' ? 'text-red' : 'text-gray'

  // Share mode is read-only: the status itself is public information (it's
  // already shown in Today's readiness card there), but no mutation
  // control is ever exposed — same pattern as the manual-item ••• menu.
  if (shareMode) {
    return <Icon size={size} className={`shrink-0 ${colorClass}`} aria-hidden="true" />
  }

  const handleToggle = () => {
    if (resolved) {
      unresolveOpenItem(trip.meta.id, item.id)
      return
    }
    resolveOpenItem(trip.meta.id, item.id, true)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={resolved}
      aria-label={resolved ? `Reopen "${item.label}"` : `Mark "${item.label}" done`}
      className="-m-2.5 flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <Icon size={size} className={colorClass} />
    </button>
  )
}
