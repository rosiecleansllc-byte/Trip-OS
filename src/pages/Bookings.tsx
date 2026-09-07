import { AlertTriangle, Award, Bed, Ticket, UtensilsCrossed } from 'lucide-react'
import type { Booking, BookingCategory, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusTag } from '../components/ui/StatusTag'
import { formatDateCompact } from '../lib/date'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { redactBooking } from '../lib/share'

const CATEGORY_META: Record<BookingCategory, { label: string; icon: typeof Bed }> = {
  hotel: { label: 'Stays', icon: Bed },
  dining: { label: 'Dining', icon: UtensilsCrossed },
  ticket: { label: 'Tickets', icon: Ticket },
  activity: { label: 'Activities', icon: Ticket },
  other: { label: 'Other', icon: Ticket },
}

function BookingRow({ booking, shareMode }: { booking: Booking; shareMode: boolean }) {
  const b = shareMode ? redactBooking(booking) : booking
  const dateLabel = b.dateEnd && b.dateEnd !== b.dateStart
    ? `${formatDateCompact(b.dateStart)} – ${formatDateCompact(b.dateEnd)}`
    : formatDateCompact(b.dateStart)

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{b.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{dateLabel}{b.time ? ` · ${b.time}` : ''}</p>
        </div>
        <StatusTag status={b.status} className="shrink-0" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        <span className="font-medium text-ink">{formatMoney(b.cost)}</span>
        {b.isPointsBooking && (
          <span className="inline-flex items-center gap-1 text-blue">
            <Award size={12} /> Points booking
          </span>
        )}
        {!shareMode && b.confirmationCode && <span>Conf: {b.confirmationCode}</span>}
      </div>

      {!shareMode && b.notes && <p className="mt-2 text-xs text-ink-soft">{b.notes}</p>}
      {b.tip && <p className="mt-2 text-xs italic text-gray">{b.tip}</p>}

      {b.cancellationDeadline && b.status !== 'cancelled' && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-warn-tint px-2.5 py-1.5 text-xs text-warn">
          <AlertTriangle size={13} />
          Cancel/confirm by {formatDateCompact(b.cancellationDeadline)}
        </div>
      )}
    </Card>
  )
}

export function Bookings({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const order: BookingCategory[] = ['hotel', 'dining', 'ticket', 'activity', 'other']
  const byCategory = order
    .map((cat) => ({ cat, items: trip.bookings.filter((b) => b.category === cat) }))
    .filter((g) => g.items.length > 0)

  const pendingCount = trip.bookings.filter((b) => b.status === 'pending').length

  return (
    <div className="animate-fade-in space-y-7">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray">Everything booked</p>
        <h1 className="font-display text-2xl text-ink">Bookings</h1>
        {pendingCount > 0 && (
          <p className="mt-1 text-sm text-ink-soft">
            {pendingCount} item{pendingCount === 1 ? '' : 's'} still pending
          </p>
        )}
      </div>

      {byCategory.map(({ cat, items }) => {
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat}>
            <SectionHeader eyebrow={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} title={meta.label} />
            <div className="space-y-2.5">
              {items.map((b) => (
                <BookingRow key={b.id} booking={b} shareMode={shareMode} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
