import { CheckCircle2, Clock3, Map } from 'lucide-react'
import type { DayPlan } from '../../types/trip'
import { formatTime } from '../../lib/date'
import { buildDayRouteMapUrl, buildDayRunPlan } from '../../lib/dayRun'
import { Card } from '../ui/Card'
import { SectionHeader } from '../ui/SectionHeader'

export function DayRunPlan({
  day,
  now,
  preferDriving,
}: {
  day: DayPlan
  now: Date
  preferDriving: boolean
}) {
  const steps = buildDayRunPlan(day, now)
  const routeUrl = buildDayRouteMapUrl(day, preferDriving ? 'driving' : 'walking')
  if (steps.length === 0) return null

  return (
    <div>
      <SectionHeader
        eyebrow="Run the day"
        title="Play-by-play"
        action={
          routeUrl ? (
            <a
              href={routeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue"
            >
              <Map size={14} /> Map
            </a>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <ol className="divide-y divide-line">
          {steps.map(({ item, state, leaveByLabel }) => (
            <li key={item.id} className="flex gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                {state === 'done' ? (
                  <CheckCircle2 size={16} className="text-blue" />
                ) : (
                  <span
                    className={
                      state === 'next'
                        ? 'h-2.5 w-2.5 rounded-full bg-blue'
                        : 'h-2.5 w-2.5 rounded-full border border-line bg-surface'
                    }
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={state === 'done' ? 'text-sm text-ink-soft line-through' : 'text-sm font-medium text-ink'}>
                    {item.label}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-blue">
                    {formatTime(item.time) ?? (state === 'next' ? 'Next' : '')}
                  </span>
                </div>
                {leaveByLabel && state !== 'done' && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-blue">
                    <Clock3 size={11} /> Leave by {leaveByLabel}
                  </p>
                )}
                {item.location && <p className="mt-0.5 text-xs text-ink-soft">{item.location}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Timed items automatically move to completed as the day advances. Leave-by appears when travel time is known.
      </p>
    </div>
  )
}
