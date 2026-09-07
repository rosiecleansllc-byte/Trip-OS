import { BookOpen, Car, ExternalLink, Plane, Train } from 'lucide-react'
import type { ManualTripItem, Transport as TransportLeg, TransportMode, Trip } from '../types/trip'
import { ActionRow } from '../components/ui/ActionRow'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusTag } from '../components/ui/StatusTag'
import { ManualItemMenu } from '../components/manual/ManualItemMenu'
import { formatDateCompact } from '../lib/date'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { redactTransport } from '../lib/share'
import { getEffectiveTrip } from '../lib/manualItems'

const MODE_META: Record<TransportMode, { label: string; icon: typeof Plane }> = {
  flight: { label: 'Flights', icon: Plane },
  train: { label: 'Trains', icon: Train },
  local: { label: 'Local transit', icon: Train },
  car: { label: 'Car', icon: Car },
}

function TransportRow({
  leg,
  manualItem,
  trip,
  shareMode,
}: {
  leg: TransportLeg
  manualItem?: ManualTripItem
  trip: Trip
  shareMode: boolean
}) {
  const t = shareMode ? redactTransport(leg) : leg
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            {t.from} <span className="text-gray">→</span> {t.to}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatDateCompact(t.date)}
            {t.departTime ? ` · ${t.departTime}${t.arriveTime ? `–${t.arriveTime}` : ''}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusTag status={t.status} />
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} trip={trip} />}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        {t.carrier && <span>{t.carrier}</span>}
        {t.number && <span>{t.number}</span>}
        <span className="font-medium text-ink">{formatMoney(t.cost)}</span>
        {!shareMode && t.confirmationCode && <span>Conf: {t.confirmationCode}</span>}
      </div>
      {!shareMode && t.notes && <p className="mt-2 text-xs text-ink-soft">{t.notes}</p>}
      {t.tip && <p className="mt-2 text-xs italic text-gray">{t.tip}</p>}

      <ActionRow
        location={t.location}
        websiteUrl={t.websiteUrl}
        ticketUrl={t.ticketUrl}
        phone={t.phone}
        privateTicketUrl={t.privateTicketUrl}
        modifyUrl={t.modifyUrl}
        privateDocumentKey={t.privateDocumentKey}
        privateDocumentLabel={t.privateDocumentLabel}
        privateDocumentType={t.privateDocumentType}
        shareMode={shareMode}
        className="mt-3"
      />
    </Card>
  )
}

export function Transport({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const manualItemsById = new Map(manualItems.filter((i) => i.tripId === trip.meta.id).map((i) => [i.id, i]))

  const order: TransportMode[] = ['flight', 'train', 'local', 'car']
  const byMode = order
    .map((mode) => ({
      mode,
      items: effectiveTrip.transport.filter((t) => t.mode === mode).sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .filter((g) => g.items.length > 0)

  // Public reference links (an official transit map, etc.) — not a booking,
  // so kept visually separate below the booked legs. Safe in Share mode
  // too unless a resource explicitly opts out with isPrivate.
  const resources = (trip.resources ?? []).filter((r) => !r.isPrivate || !shareMode)

  return (
    <div className="animate-fade-in space-y-7">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Getting around</p>
        <h1 className="font-display text-2xl text-ink">Transport</h1>
      </div>

      {byMode.map(({ mode, items }) => {
        const meta = MODE_META[mode]
        const Icon = meta.icon
        return (
          <div key={mode}>
            <SectionHeader
              title={meta.label}
              action={<Icon size={16} className="text-blue" />}
            />
            <div className="space-y-2.5">
              {items.map((t) => (
                <TransportRow key={t.id} leg={t} manualItem={manualItemsById.get(t.id)} trip={trip} shareMode={shareMode} />
              ))}
            </div>
          </div>
        )
      })}

      {resources.length > 0 && (
        <div>
          <SectionHeader title="Travel resources" action={<BookOpen size={16} className="text-blue" />} />
          <p className="mb-2 text-xs text-ink-soft">Public reference links — not part of any booking.</p>
          <div className="space-y-2.5">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Card className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{r.title}</p>
                    {r.description && <p className="mt-0.5 text-xs text-ink-soft">{r.description}</p>}
                  </div>
                  <ExternalLink size={15} className="mt-0.5 shrink-0 text-blue" />
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
