import { Award, CircleDollarSign, EyeOff } from 'lucide-react'
import type { Booking, Transport, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { getEffectiveTrip } from '../lib/manualItems'

type Costed = (Booking | Transport) & { label: string }

export function WalletPage({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)

  if (shareMode) {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-3 pt-20 text-center">
        <EyeOff className="text-blue" size={26} />
        <h1 className="font-display text-xl text-ink">Wallet is hidden in Share mode</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Costs and payment status stay private. Turn off Share mode to view them again.
        </p>
      </div>
    )
  }

  const items: Costed[] = [
    ...effectiveTrip.bookings.map((b) => ({ ...b, label: b.name })),
    ...effectiveTrip.transport.map((t) => ({ ...t, label: `${t.from} → ${t.to}` })),
  ]

  const currencies = Array.from(
    new Set(items.filter((i) => i.cost).map((i) => i.cost!.currency))
  )
  if (currencies.length === 0) currencies.push(trip.meta.tripCurrency)

  const paidByCurrency: Record<string, number> = {}
  const remainingByCurrency: Record<string, number> = {}
  let tbdCount = 0

  for (const item of items) {
    const isPoints = 'isPointsBooking' in item && item.isPointsBooking
    if (!item.cost) {
      if (item.status !== 'cancelled' && !isPoints) tbdCount += 1
      continue
    }
    if (item.status === 'paid') {
      paidByCurrency[item.cost.currency] = (paidByCurrency[item.cost.currency] ?? 0) + item.cost.amount
    } else if (item.status !== 'cancelled') {
      remainingByCurrency[item.cost.currency] = (remainingByCurrency[item.cost.currency] ?? 0) + item.cost.amount
    }
  }

  const pointsItems = items.filter((i) => 'isPointsBooking' in i && i.isPointsBooking)

  return (
    <div className="animate-fade-in space-y-7">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Trip spend</p>
        <h1 className="font-display text-2xl text-ink">Wallet</h1>
      </div>

      <div>
        <SectionHeader title="Paid so far" />
        <div className="grid grid-cols-2 gap-3">
          {currencies.map((cur) => (
            <Card key={cur} accent="blue" className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-gray">{cur}</p>
              <p className="font-display text-2xl text-ink">
                {formatMoney({ amount: paidByCurrency[cur] ?? 0, currency: cur })}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Remaining / pending" />
        <div className="grid grid-cols-2 gap-3">
          {currencies.map((cur) => (
            <Card key={cur} accent={(remainingByCurrency[cur] ?? 0) > 0 ? 'red' : undefined} className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-gray">{cur}</p>
              <p className="font-display text-2xl text-ink">
                {formatMoney({ amount: remainingByCurrency[cur] ?? 0, currency: cur })}
              </p>
            </Card>
          ))}
        </div>
        {tbdCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
            <CircleDollarSign size={13} className="text-gray" />
            {tbdCount} item{tbdCount === 1 ? '' : 's'} without a cost yet — add them as bookings firm up.
          </p>
        )}
      </div>

      {pointsItems.length > 0 && (
        <div>
          <SectionHeader eyebrow={`${pointsItems.length} item${pointsItems.length === 1 ? '' : 's'}`} title="Booked with points" />
          <div className="space-y-2">
            {pointsItems.map((item) => (
              <Card key={item.id} className="flex items-center gap-2.5 p-3">
                <Award size={16} className="shrink-0 text-blue" />
                <span className="flex-1 text-sm text-ink">{item.label}</span>
                <span className="text-xs font-medium text-blue">Points</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {trip.meta.budgetNote && (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray">Remaining spend guidance</p>
          <p className="mt-1.5 text-sm text-ink-soft">{trip.meta.budgetNote}</p>
        </Card>
      )}

      <p className="pt-1 text-center text-[11px] text-gray">
        Costs are shown in the currency they were charged in. Toggle Share mode to hide amounts.
      </p>
    </div>
  )
}
