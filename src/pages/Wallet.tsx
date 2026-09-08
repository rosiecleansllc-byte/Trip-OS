import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Award, CircleDollarSign, EyeOff, Search, Wallet as WalletIcon } from 'lucide-react'
import type { Booking, Transport, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { WalletDocCard } from '../components/wallet/WalletDocCard'
import { formatMoney } from '../lib/money'
import { useAppStore } from '../store/useAppStore'
import { getEffectiveTrip } from '../lib/manualItems'
import { getTripTimeZone, nowInZone } from '../lib/timezone'
import { findCurrentDay, tripPhase } from '../lib/date'
import { buildWalletDocEntries, sortWalletEntries, WALLET_CATEGORY_LABEL, WALLET_CATEGORY_ORDER, type WalletCategory } from '../lib/walletDocs'

type Costed = (Booking | Transport) & { label: string }

// The Wallet's original purpose (paid/remaining/points) is preserved
// unchanged as the "Spend" tab — this component is exactly the previous
// WalletPage body, just relocated so "Documents" (the new central
// document hub) can be the default tab without losing anything that was
// here before.
function SpendTab({ trip, effectiveTrip }: { trip: Trip; effectiveTrip: Trip }) {
  const items: Costed[] = [
    ...effectiveTrip.bookings.map((b) => ({ ...b, label: b.name })),
    ...effectiveTrip.transport.map((t) => ({ ...t, label: `${t.from} → ${t.to}` })),
  ]

  const currencies = Array.from(new Set(items.filter((i) => i.cost).map((i) => i.cost!.currency)))
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
    <div className="space-y-7">
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

function DocumentsTab({ trip, effectiveTrip }: { trip: Trip; effectiveTrip: Trip }) {
  const tz = getTripTimeZone(trip)
  const now = nowInZone(tz)
  const phase = tripPhase(trip.meta.startDate, trip.meta.endDate, now)
  const today = findCurrentDay(effectiveTrip.days, now)

  const entries = useMemo(() => sortWalletEntries(buildWalletDocEntries(effectiveTrip)), [effectiveTrip])

  const todayEntries = today ? entries.filter((e) => e.date === today.date) : []
  const upcomingEntries =
    phase === 'active' && today
      ? entries.filter((e) => e.date > today.date)
      : phase === 'pre'
        ? entries
        : []

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<WalletCategory | 'all'>('all')
  const filtered = entries.filter(
    (e) => (filterCat === 'all' || e.category === filterCat) && (!search.trim() || e.title.toLowerCase().includes(search.trim().toLowerCase()))
  )
  const grouped = WALLET_CATEGORY_ORDER.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter(
    (g) => g.items.length > 0
  )

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
        <WalletIcon size={22} className="text-ink-soft" />
        <p className="text-sm font-medium text-ink">No documents yet</p>
        <p className="max-w-[240px] text-xs text-ink-soft">
          Tickets, reservations, and confirmations you add across Bookings and Transport will collect here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {todayEntries.length > 0 && (
        <div>
          <SectionHeader eyebrow={`${todayEntries.length} item${todayEntries.length === 1 ? '' : 's'}`} title="Today" />
          <div className="space-y-2.5">
            {todayEntries.map((e) => (
              <WalletDocCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}

      {upcomingEntries.length > 0 && (
        <div>
          <SectionHeader eyebrow={`${upcomingEntries.length} item${upcomingEntries.length === 1 ? '' : 's'}`} title="Upcoming" />
          <div className="space-y-2.5">
            {upcomingEntries.map((e) => (
              <WalletDocCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="All Documents" />
        <div className="mb-3 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
          <Search size={14} className="shrink-0 text-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents"
            className="w-full bg-transparent text-sm text-ink placeholder:text-gray focus:outline-none"
          />
        </div>
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setFilterCat('all')}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
              filterCat === 'all' ? 'border-blue bg-blue text-white' : 'border-line text-ink-soft'
            )}
          >
            All
          </button>
          {WALLET_CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={clsx(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                filterCat === cat ? 'border-blue bg-blue text-white' : 'border-line text-ink-soft'
              )}
            >
              {WALLET_CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-soft">No documents match.</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ cat, items }) => (
              <div key={cat}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  {WALLET_CATEGORY_LABEL[cat]}
                </p>
                <div className="space-y-2.5">
                  {items.map((e) => (
                    <WalletDocCard key={e.id} entry={e} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function WalletPage({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const [tab, setTab] = useState<'documents' | 'spend'>('documents')

  // Wallet holds nothing but private material (traveler documents and
  // costs/payment status) — hidden entirely in Share mode, same
  // all-or-nothing guarantee as before this PR, on both tabs.
  if (shareMode) {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-3 pt-20 text-center">
        <EyeOff className="text-blue" size={26} />
        <h1 className="font-display text-xl text-ink">Wallet is hidden in Share mode</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Documents, costs, and payment status stay private. Turn off Share mode to view them again.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Trip wallet</p>
        <h1 className="font-display text-2xl text-ink">Wallet</h1>
      </div>

      <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
        {(['documents', 'spend'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
              tab === key ? 'bg-blue text-white' : 'text-ink-soft'
            )}
          >
            {key === 'documents' ? 'Documents' : 'Spend'}
          </button>
        ))}
      </div>

      {tab === 'documents' ? (
        <DocumentsTab trip={trip} effectiveTrip={effectiveTrip} />
      ) : (
        <SpendTab trip={trip} effectiveTrip={effectiveTrip} />
      )}
    </div>
  )
}
