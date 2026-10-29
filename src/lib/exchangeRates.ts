import { useEffect, useState } from 'react'

export interface ExchangeRates { rates: Record<string, number>; asOf: number; fetchedAt: number }
const CACHE_KEY = 'trip-os-fx-usd-v1'
export function parseExchangeRates(value: unknown, now = Date.now()): ExchangeRates {
  const data = value as { result?: string; base_code?: string; time_last_update_unix?: number; rates?: Record<string, unknown> }
  if (data?.result !== 'success' || data.base_code !== 'USD' || !Number.isFinite(data.time_last_update_unix) || !data.rates || data.rates.USD !== 1) throw new Error('Invalid exchange-rate response.')
  const rates = Object.fromEntries(Object.entries(data.rates).filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && typeof rate === 'number' && Number.isFinite(rate) && rate > 0)) as Record<string, number>
  return { rates, asOf: data.time_last_update_unix! * 1000, fetchedAt: now }
}
export function convertCurrency(amount: number, from: string, to: string, rates?: Record<string, number>): number | undefined {
  if (!Number.isFinite(amount)) return undefined
  if (from === to) return amount
  if (!rates?.[from] || !rates?.[to]) return undefined
  return amount / rates[from] * rates[to]
}
export function convertTotals(totals: Record<string, number>, target: string, rates?: Record<string, number>): number | undefined {
  let result = 0
  for (const [currency, amount] of Object.entries(totals)) {
    const converted = convertCurrency(amount, currency, target, rates)
    if (converted === undefined) return undefined
    result += converted
  }
  return result
}
function readCache(): ExchangeRates | undefined {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as ExchangeRates | null
    if (!data || !Number.isFinite(data.asOf) || !Number.isFinite(data.fetchedAt)) return
    parseExchangeRates({ result: 'success', base_code: 'USD', rates: data.rates, time_last_update_unix: data.asOf / 1000 })
    return data
  } catch { return }
}
export function useExchangeRates() {
  const [data, setData] = useState<ExchangeRates | undefined>(readCache)
  const [error, setError] = useState('')
  useEffect(() => {
    const cached = readCache()
    if (cached && Date.now() - cached.fetchedAt < 86400000) return
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Exchange rates unavailable.')
      return response.json()
    }).then(value => {
      const parsed = parseExchangeRates(value)
      if (controller.signal.aborted) return
      setData(parsed)
      setError('')
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(parsed)) } catch { /* Conversion still works without caching. */ }
    }).catch(() => { if (cancelled) return; if (!cached) setError('Exchange rates are unavailable. Original amounts are still shown.'); else setError('Using saved rates; check the rate date below.') }).finally(() => clearTimeout(timeout))
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout) }
  }, [])
  return { data, error }
}
