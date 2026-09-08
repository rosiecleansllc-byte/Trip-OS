import type { Trip } from '../../types/trip'
import { useTripAlerts } from './useTripAlerts'
import { useAlertCenterUiStore } from '../../store/useAlertCenterUiStore'
import { ALERT_TYPE_ICON, PRIORITY_BG, PRIORITY_TEXT } from './alertMeta'

// At most one alert surfaces directly on Today — the single most urgent
// one (alerts are already sorted Now > Today > Upcoming, then priority,
// by useTripAlerts) — everything else stays in the Alert Center so
// Today never turns into a stack of banners.
export function TodayAlertBanner({
  trip,
  effectiveTrip,
  now,
  realNow,
}: {
  trip: Trip
  effectiveTrip: Trip
  now: Date
  realNow: Date
}) {
  const { alerts } = useTripAlerts(trip, effectiveTrip, now, realNow)
  const openPanel = useAlertCenterUiStore((s) => s.openPanel)
  const top = alerts[0]
  if (!top) return null

  const Icon = ALERT_TYPE_ICON[top.type]

  return (
    <button
      type="button"
      onClick={openPanel}
      className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left ${PRIORITY_BG[top.priority]}`}
    >
      <Icon size={15} className={`mt-0.5 shrink-0 ${PRIORITY_TEXT[top.priority]}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{top.title}</span>
        {top.detail && <span className="block text-xs text-ink-soft">{top.detail}</span>}
      </span>
    </button>
  )
}
