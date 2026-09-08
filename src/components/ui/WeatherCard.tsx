import { CloudOff, RefreshCw } from 'lucide-react'
import { Card } from './Card'
import { describeWeatherCode, minutesAgoLabel, type UseWeatherResult } from '../../lib/weather'

// The compact "current + today" weather card used on Today (active trip),
// the Trip Overview page, and Pack's outlook — one component so all three
// look and behave identically, including the loading/unavailable states.
// Trip's per-day compact chip is deliberately separate (no card, no
// refresh control) since it's a much smaller secondary summary.
export function WeatherCard({
  label,
  weather,
  compact,
}: {
  label: string
  weather: UseWeatherResult
  compact?: boolean
}) {
  const { status, snapshot, refresh, lastUpdatedAt, stale } = weather
  const padding = compact ? 'p-3' : 'p-4'

  if (status === 'error') {
    // Never fabricate data: with nothing cached to fall back to (see
    // useWeather), offline just says so plainly rather than implying a
    // Retry might work when there's no connectivity to retry with.
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <Card className={padding}>
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <CloudOff size={13} /> {offline ? 'Weather unavailable offline' : 'Weather unavailable'}
          </p>
          {!offline && (
            <button type="button" onClick={refresh} className="text-xs font-medium text-blue">
              Retry
            </button>
          )}
        </div>
      </Card>
    )
  }

  if (status !== 'ready' || !snapshot?.current) {
    return (
      <Card className={padding}>
        <p className="text-xs text-ink-soft">Loading weather…</p>
      </Card>
    )
  }

  const { current, daily } = snapshot
  const todayForecast = daily[0]
  const { label: condLabel, emoji } = describeWeatherCode(current.code)

  return (
    <Card className={padding}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh weather"
          className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-blue"
        >
          {lastUpdatedAt ? `${stale ? 'Last updated' : 'Updated'} ${minutesAgoLabel(lastUpdatedAt)}` : <RefreshCw size={11} />}
        </button>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl text-ink">{current.tempF}°F</span>
        <span className="text-xs text-ink-soft">
          {emoji} {condLabel}
        </span>
      </p>
      {todayForecast && (
        <p className="mt-1 text-xs text-ink-soft">
          High {todayForecast.highF}° · Low {todayForecast.lowF}°
          {todayForecast.precipitationChance != null ? ` · Rain ${todayForecast.precipitationChance}%` : ''}
          {current.feelsLikeF !== current.tempF ? ` · Feels like ${current.feelsLikeF}°` : ''}
        </p>
      )}
    </Card>
  )
}
