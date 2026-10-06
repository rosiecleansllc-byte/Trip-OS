import { Accessibility } from 'lucide-react'
import { Card } from '../ui/Card'
import { useAppStore } from '../../store/useAppStore'

const OPTIONS = [
  { key: 'reduceWalking', label: 'Reduce walking' },
  { key: 'avoidStairs', label: 'Avoid stairs' },
  { key: 'preferElevators', label: 'Prefer elevators' },
  { key: 'preferRideshare', label: 'Prefer taxi / rideshare for harder transfers' },
  { key: 'slowerPace', label: 'Slower pace with rest time' },
] as const

export function MobilityPreferencesCard() {
  const prefs = useAppStore((s) => s.mobilityPreferences)
  const setPref = useAppStore((s) => s.setMobilityPreference)

  return (
    <Card className="p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-tint text-blue">
          <Accessibility size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Accessibility & pace</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Trip OS uses these preferences when presenting routes, day plans and travel recommendations.
          </p>
        </div>
      </div>
      <div className="mt-3 divide-y divide-line">
        {OPTIONS.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-ink">{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => setPref(key, e.target.checked)}
              className="h-4 w-4 accent-blue"
            />
          </label>
        ))}
      </div>
    </Card>
  )
}
