import { Car, Plane, Train } from 'lucide-react'
import type { Transport as TransportLeg, TransportMode, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusTag } from '../components/ui/StatusTag'
import { formatDateCompact } from '../lib/date'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { redactTransport } from '../lib/share'

const MODE_META: Record<TransportMode, { label: string; icon: typeof Plane }> = {
  flight: { label: 'Flights', icon: Plane },
  train: { label: 'Trains', icon: Train },
  local: { label: 'Local transit', icon: Train },
  car: { label: 'Car', icon: Car },
}

function TransportRow({ leg, shareMode }: { leg: TransportLeg; shareMode: boolean }) {
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
        <StatusTag status={t.status} className="shrink-0" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        {t.carrier && <span>{t.carrier}</span>}
        {t.number && <span>{t.number}</span>}
        <span className="font-medium text-ink">{formatMoney(t.cost)}</span>
        {!shareMode && t.confirmationCode && <span>Conf: {t.confirmationCode}</span>}
      </div>
      {!shareMode && t.notes && <p className="mt-2 text-xs text-ink-soft">{t.notes}</p>}
      {t.tip && <p className="mt-2 text-xs italic text-gray">{t.tip}</p>}
    </Card>
  )
}

export function Transport({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const order: TransportMode[] = ['flight', 'train', 'local', 'car']
  const byMode = order
    .map((mode) => ({
      mode,
      items: trip.transport.filter((t) => t.mode === mode).sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="animate-fade-in space-y-7">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray">Getting around</p>
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
                <TransportRow key={t.id} leg={t} shareMode={shareMode} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
