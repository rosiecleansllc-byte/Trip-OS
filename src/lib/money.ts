import type { Money } from '../types/trip'

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

export function formatMoney(money?: Money | null): string {
  if (!money) return 'TBD'
  const symbol = SYMBOLS[money.currency] ?? `${money.currency} `
  return `${symbol}${money.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? `${currency} `
}

export function sumMoney(items: (Money | null | undefined)[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const m of items) {
    if (!m) continue
    totals[m.currency] = (totals[m.currency] ?? 0) + m.amount
  }
  return totals
}
