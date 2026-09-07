import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import { trips } from '../data/tripsIndex'
import { Card } from '../components/ui/Card'
import { daysUntil, formatDateCompact, tripPhase } from '../lib/date'
import { computeReadiness } from '../lib/readiness'
import { useAppStore } from '../store/useAppStore'

const PHASE_LABEL: Record<'pre' | 'active' | 'post', string> = {
  pre: 'Upcoming',
  active: 'In progress',
  post: 'Completed',
}

export function TripsHome() {
  const navigate = useNavigate()
  const setCurrentTripId = useAppStore((s) => s.setCurrentTripId)

  const sorted = [...trips].sort((a, b) => a.meta.startDate.localeCompare(b.meta.startDate))

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">Trip OS</p>
        <h1 className="font-display text-2xl text-ink">Your trips</h1>

        <div className="mt-5 space-y-3">
          {sorted.map((trip) => {
            const phase = tripPhase(trip.meta.startDate, trip.meta.endDate)
            const countdown = daysUntil(trip.meta.startDate)
            const dayCount = trip.days.length
            const readiness = computeReadiness(trip)

            return (
              <button
                key={trip.meta.id}
                type="button"
                onClick={() => {
                  setCurrentTripId(trip.meta.id)
                  navigate('/today')
                }}
                className="block w-full text-left"
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg text-ink">{trip.meta.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                        <MapPin size={12} />
                        {trip.meta.destinationLabel}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        phase === 'active'
                          ? 'bg-blue text-white'
                          : phase === 'pre'
                            ? 'bg-blue-tint text-blue'
                            : 'bg-bg-soft text-ink-soft'
                      )}
                    >
                      {PHASE_LABEL[phase]}
                    </span>
                  </div>

                  <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-soft">
                    <CalendarDays size={12} />
                    {formatDateCompact(trip.meta.startDate)} – {formatDateCompact(trip.meta.endDate)} · {dayCount} days
                    {phase === 'pre' && countdown > 0 ? ` · ${countdown} day${countdown === 1 ? '' : 's'} away` : ''}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
                        <div
                          className="h-full rounded-full bg-blue transition-all"
                          style={{ width: `${readiness.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft">{readiness.percent}% ready</p>
                    </div>
                    <ChevronRight size={18} className="ml-3 shrink-0 text-gray" />
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
