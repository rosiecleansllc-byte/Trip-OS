const COMMON = ['USD', 'PEN', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'BRL', 'JPY', 'CHF']
export function CurrencySelect({ value, onChange, label, className = '' }: { value: string; onChange: (value: string) => void; label: string; className?: string }) {
  let supported: string[] = []
  try { supported = Intl.supportedValuesOf('currency') } catch { /* Common currencies cover older browsers. */ }
  const currencies = [...new Set([...COMMON, value, ...supported])]
  let names: Intl.DisplayNames | undefined
  try { names = new Intl.DisplayNames(['en'], { type: 'currency' }) } catch { /* ISO codes remain readable. */ }
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className={className}>
    {currencies.map(code => <option key={code} value={code}>{code}{names ? ` — ${names.of(code) ?? code}` : ''}</option>)}
  </select>
}
