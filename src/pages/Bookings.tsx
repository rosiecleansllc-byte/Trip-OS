import { AlertTriangle, Award, Bed, Circle, ClipboardList, Ticket, UtensilsCrossed } from 'lucide-react'
import type { Booking, BookingCategory, ManualTripItem, Trip } from '../types/trip'
import { ActionRow } from '../components/ui/ActionRow'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusTag } from '../components/ui/StatusTag'
import { ManualItemMenu } from '../components/manual/ManualItemMenu'
import { formatDateCompact, formatDateTimeCompact } from '../lib/date'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { redactBooking } from '../lib/share'
import { findManualItemsForOpenItem, getEffectiveTrip } from '../lib/manualItems'

const CATEGORY_META: Record<BookingCategory, { label: string; icon: typeof Bed }> = {
  hotel: { label: 'Stays', icon: Bed },
  dining: { label: 'Dining', icon: UtensilsCrossed },
  ticket: { label: 'Tickets', icon: Ticket },
  activity: { label: 'Activities', icon: Ticket },
  other: { label: 'Other', icon: Ticket },
}

function BookingRow({
  booking,
  manualItem,
  shareMode,
}: {
  booking: Booking
  manualItem?: ManualTripItem
  shareMode: boolean
}) {
  const b = shareMode ? redactBooking(booking) : booking
  const dateLabel = b.dateEnd && b.dateEnd !== b.dateStart
    ? `${formatDateCompact(b.dateStart)} – ${formatDateCompact(b.dateEnd)}`
    : formatDateCompact(b.dateStart)

  const hasOpenDeadline = Boolean(b.cancellationDeadline) && b.status !== 'cancelled'

  return (
    <Card accent={hasOpenDeadline ? 'red' : undefined} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{b.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{dateLabel}{b.time ? ` · ${b.time}` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusTag status={b.status} />
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} />}
        </div>
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

      <ActionRow
        location={b.address}
        websiteUrl={b.websiteUrl}
        ticketUrl={b.ticketUrl}
        reservationUrl={b.reservationUrl}
        menuUrl={b.menuUrl}
        phone={b.phone}
        privateTicketUrl={b.privateTicketUrl}
        modifyUrl={b.modifyUrl}
        privateDocumentKey={b.privateDocumentKey}
        privateDocumentLabel={b.privateDocumentLabel}
        privateDocumentType={b.privateDocumentType}
        shareMode={shareMode}
        className="mt-3"
      />

      {b.cancellationDeadline && b.status !== 'cancelled' && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-tint px-2.5 py-1.5 text-xs text-red">
          <AlertTriangle size={13} />
          Cancel/confirm by {formatDateTimeCompact(b.cancellationDeadline)}
        </div>
      )}
    </Card>
  )
}

export function Bookings({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const resolveOpenItem = useAppStore((s) => s.resolveOpenItem)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const manualItemsById = new Map(manualItems.filter((i) => i.tripId === trip.meta.id).map((i) => [i.id, i]))

  const order: BookingCategory[] = ['hotel', 'dining', 'ticket', 'activity', 'other']
  const byCategory = order
    .map((cat) => ({ cat, items: effectiveTrip.bookings.filter((b) => b.category === cat) }))
    .filter((g) => g.items.length > 0)

  const pendingCount = effectiveTrip.bookings.filter((b) => b.status === 'pending').length
  const openItems = effectiveTrip.openItems
    .filter((i) => i.status === 'open')
    .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

  return (
    <div className="animate-fade-in space-y-7">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Everything booked</p>
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
                <BookingRow key={b.id} booking={b} manualItem={manualItemsById.get(b.id)} shareMode={shareMode} />
              ))}
            </div>
          </div>
        )
      })}

      {openItems.length > 0 && (
        <div>
          <SectionHeader title="Still open" action={<ClipboardList size={16} className="text-blue" />} />
          <div className="space-y-2.5">
            {openItems.map((item) => {
              const resolvableBy = shareMode ? [] : findManualItemsForOpenItem(trip, manualItems, item)
              return (
                <Card key={item.id} className="flex items-start gap-2.5 p-3.5">
                  <Circle size={15} className={`mt-0.5 shrink-0 ${item.priority === 'high' ? 'text-red' : 'text-gray'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{item.label}</p>
                    {item.detail && <p className="mt-0.5 text-xs text-ink-soft">{item.detail}</p>}
                  </div>
                  {resolvableBy.length > 0 && (
                    <button
                      type="button"
                      onClick={() => resolveOpenItem(trip.meta.id, item.id)}
                      className="shrink-0 rounded-full bg-blue px-2.5 py-1 text-xs font-medium text-white"
                    >
                      Mark resolved
                    </button>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
