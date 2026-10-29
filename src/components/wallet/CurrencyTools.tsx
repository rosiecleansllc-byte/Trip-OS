import { useState } from 'react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useManualItemUiStore } from '../../store/useManualItemUiStore'
import { CurrencySelect } from '../ui/CurrencySelect'
import { convertCurrency, convertTotals, useExchangeRates } from '../../lib/exchangeRates'
import { formatMoney } from '../../lib/money'

const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink'
export function BookingCurrencies({ trip }: { trip: Trip }) {
  const all = useAppStore(s => s.manualItems)
  const update = useAppStore(s => s.updateManualItem)
  const shareMode = useAppStore(s => s.shareMode)
  const openEdit = useManualItemUiStore(s => s.openEdit)
  const items = all.filter(item => item.tripId === trip.meta.id && item.cost != null)
  if (shareMode || trip.meta.sharedLinkId || !items.length) return null
  return <section className="space-y-3 rounded-2xl border border-line p-4" aria-label="Booking currencies">
    <h2 className="font-display text-lg text-ink">Booking currencies</h2>
    <p className="text-xs text-ink-soft">Choose the currency actually charged for each item. Changing it corrects the label and totals; it does not convert the amount.</p>
    {items.map(item => <div key={item.id} className="space-y-1 border-t border-line pt-3">
      <p className="break-words text-sm font-medium text-ink">{item.title || `${item.fromLocation ?? ''} → ${item.toLocation ?? ''}`}</p>
      <p className="text-sm text-ink">{formatMoney({ amount: item.cost!, currency: item.currency ?? 'USD' })} · {item.status === 'paid' ? 'Paid' : 'Remaining / pending'}</p>
      <CurrencySelect label={`Currency for ${item.title || item.id}`} value={item.currency ?? 'USD'} onChange={currency => update(item.id, { currency })} className={inputClass} />
      <button type="button" onClick={() => openEdit(item)} className="py-1 text-xs text-blue underline">Edit amount or payment status</button>
    </div>)}
  </section>
}
export function CurrencyTools({ trip, paid, remaining, initialAmount = 1 }: { trip: Trip; paid: Record<string, number>; remaining: Record<string, number>; initialAmount?: number }) {
  const { data, error } = useExchangeRates()
  const [viewedAt] = useState(Date.now)
  const [display, setDisplay] = useState(trip.meta.homeCurrency)
  const [from, setFrom] = useState(trip.meta.homeCurrency)
  const [to, setTo] = useState(trip.meta.tripCurrency)
  const [amount, setAmount] = useState(String(initialAmount))
  const numericAmount = amount.trim() ? Number(amount) : NaN
  const rate = convertCurrency(1, from, to, data?.rates)
  const converted = convertCurrency(numericAmount, from, to, data?.rates)
  const estimatedPaid = convertTotals(paid, display, data?.rates)
  const estimatedRemaining = convertTotals(remaining, display, data?.rates)
  return <section className="space-y-4 rounded-2xl border border-line p-4" aria-label="Currency conversion">
    <h2 className="font-display text-lg text-ink">Currency & exchange rate</h2>
    <label className="block text-xs text-ink-soft">Show estimated totals in<CurrencySelect label="Estimated totals currency" value={display} onChange={setDisplay} className={inputClass} /></label>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <p>Estimated paid<br /><strong>{estimatedPaid === undefined ? 'Rate unavailable' : formatMoney({ amount: estimatedPaid, currency: display })}</strong></p>
      <p>Estimated remaining<br /><strong>{estimatedRemaining === undefined ? 'Rate unavailable' : formatMoney({ amount: estimatedRemaining, currency: display })}</strong></p>
    </div>
    <label className="block text-xs text-ink-soft">Amount to convert<input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} /></label>
    <label className="block text-xs text-ink-soft">From<CurrencySelect label="Convert from currency" value={from} onChange={setFrom} className={inputClass} /></label>
    <label className="block text-xs text-ink-soft">To<CurrencySelect label="Convert to currency" value={to} onChange={setTo} className={inputClass} /></label>
    {rate !== undefined ? <div className="space-y-1" role="status">
      <p className="text-sm text-ink">1 {from} ≈ {rate.toLocaleString('en-US', { maximumFractionDigits: 6 })} {to}</p>
      {converted !== undefined && <p className="font-medium text-blue">{formatMoney({ amount: numericAmount, currency: from })} {from} ≈ {formatMoney({ amount: converted, currency: to })} {to}</p>}
    </div> : <p role="status" className="text-xs text-ink-soft">{error ? 'No current reference rate.' : data ? 'Rate unavailable for this currency pair.' : 'Loading reference rates…'}</p>}
    {data && <p className="text-[11px] text-ink-soft">Rate date: {new Date(data.asOf).toLocaleString('en-US', { timeZone: 'UTC' })} UTC {viewedAt - data.asOf > 48 * 3600000 ? '· Saved rate may be outdated' : ''}</p>}
    {error && <p role="status" className="text-xs text-ink-soft">{error}</p>}
    <p className="text-[11px] text-ink-soft">Reference estimates only. Your bank or card rate and fees may differ. Original booking amounts and currencies remain unchanged by conversion.</p>
    <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue underline">Rates By Exchange Rate API</a>
  </section>
}
