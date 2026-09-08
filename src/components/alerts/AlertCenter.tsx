import { useEffect, useRef, useState } from 'react'
import { BellRing, Clock3, X } from 'lucide-react'
import type { Trip } from '../../types/trip'
import type { AlertGroup, TripAlert } from '../../lib/alerts'
import { useAlertCenterUiStore } from '../../store/useAlertCenterUiStore'
import { useAppStore } from '../../store/useAppStore'
import { useTripAlerts } from './useTripAlerts'
import { ALERT_TYPE_ICON, PRIORITY_BG, PRIORITY_TEXT } from './alertMeta'

const GROUP_LABEL: Record<AlertGroup, string> = { now: 'Now', today: 'Today', upcoming: 'Upcoming' }
const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
]

function AlertRow({ trip, alert }: { trip: Trip; alert: TripAlert }) {
  const dismissAlert = useAppStore((s) => s.dismissAlert)
  const snoozeAlert = useAppStore((s) => s.snoozeAlert)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const Icon = ALERT_TYPE_ICON[alert.type]

  return (
    <div className={`rounded-xl border p-3 ${PRIORITY_BG[alert.priority]}`}>
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={`mt-0.5 shrink-0 ${PRIORITY_TEXT[alert.priority]}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{alert.title}</p>
          {alert.detail && <p className="mt-0.5 text-xs text-ink-soft">{alert.detail}</p>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => dismissAlert(trip.meta.id, alert.id)}
          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft"
        >
          Dismiss
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSnoozeOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft"
          >
            <Clock3 size={11} /> Snooze
          </button>
          {snoozeOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-24 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {SNOOZE_OPTIONS.map((o) => (
                <button
                  key={o.minutes}
                  type="button"
                  onClick={() => {
                    snoozeAlert(trip.meta.id, alert.id, new Date(Date.now() + o.minutes * 60_000).toISOString())
                    setSnoozeOpen(false)
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-ink hover:bg-bg-soft"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Always mounted (via AppShell) whether or not the sheet is open, for
// two reasons: it's the one place that owns the "seen this critical
// alert already" memory backing browser notifications below, and — same
// as AddItemSheet — mounting once avoids losing local state (an open
// snooze menu) on every render elsewhere in the tree.
export function AlertCenter({ trip, effectiveTrip, now }: { trip: Trip; effectiveTrip: Trip; now: Date }) {
  const open = useAlertCenterUiStore((s) => s.open)
  const close = useAlertCenterUiStore((s) => s.close)
  const { alerts } = useTripAlerts(trip, effectiveTrip, now)
  const setNotificationsRequested = useAppStore((s) => s.setNotificationsRequested)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )

  // Additive browser-notification bridge: only ever fires while this
  // tab's JS is actually running (Trip OS makes no promise, and adds no
  // backend, to deliver alerts once the browser/PWA is fully closed —
  // see the PR notes). Never requested automatically; only ever after
  // the explicit "Allow trip notifications" tap below. seenRef is
  // session-scoped (a fresh Set on reload), which is fine — we only need
  // to avoid re-notifying for the same alert within one open session.
  const seenRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    for (const a of alerts) {
      if (a.group !== 'now' || a.priority !== 'critical') continue
      if (seenRef.current.has(a.id)) continue
      seenRef.current.add(a.id)
      if (document.hidden) {
        try {
          new Notification(a.title, { body: a.detail, tag: a.id })
        } catch {
          // Some platforms (notably iOS Safari, even once "granted"
          // reads true in odd embedded contexts) can still throw on
          // construction — Trip Alerts already works fully in-app
          // regardless, so this is silently skipped rather than
          // surfaced as an error.
        }
      }
    }
  }, [alerts])

  if (!open) return null

  const requestNotifications = async () => {
    setNotificationsRequested(true)
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const groups: AlertGroup[] = ['now', 'today', 'upcoming']

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="px-5 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-ink">Trip Alerts</p>
            <button aria-label="Close" onClick={close} className="text-ink-soft">
              <X size={18} />
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">Nothing needs your attention right now.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => {
                const items = alerts.filter((a) => a.group === g)
                if (items.length === 0) return null
                return (
                  <div key={g}>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">{GROUP_LABEL[g]}</p>
                    <div className="space-y-2">
                      {items.map((a) => (
                        <AlertRow key={a.id} trip={trip} alert={a} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {permission === 'default' && (
            <button
              type="button"
              onClick={requestNotifications}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-medium text-blue"
            >
              <BellRing size={15} /> Allow trip notifications
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
