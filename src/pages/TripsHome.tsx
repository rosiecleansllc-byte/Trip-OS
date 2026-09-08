import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import { trips } from '../data/tripsIndex'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { daysUntil, formatDateCompact, tripPhase } from '../lib/date'
import { computeReadiness } from '../lib/readiness'
import { useAppStore } from '../store/useAppStore'

const PHASE_LABEL: Record<'pre' | 'active' | 'post', string> = {
  pre: 'Upcoming',
  active: 'In progress',
  post: 'Completed',
}

// Tapping a trip here opens its cover/overview page (see Overview.tsx),
// not straight into Today — that's a deliberate stop before the
// operational trip screens, reached from there via its own "Enter Trip"
// button.
export function TripsHome() {
  const navigate = useNavigate()
  const setCurrentTripId = useAppStore((s) => s.setCurrentTripId)

  const sorted = [...trips].sort((a, b) => a.meta.startDate.localeCompare(b.meta.startDate))

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">Trip OS</p>
        <h1 className="font-display text-2xl text-ink">Your trips</h1>

        <div className="mt-5 space-y-4">
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
                  navigate('/overview')
                }}
                className="block w-full text-left"
              >
                <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
                  <div className="relative h-48 w-full overflow-hidden">
                    <ImagePlaceholder
                      label={trip.meta.coverAlt ?? `${trip.meta.name} cover artwork`}
                      imageUrl={trip.meta.coverImageUrl}
                      fit="cover"
                      className="h-full w-full"
                      style={trip.meta.coverPosition ? { objectPosition: trip.meta.coverPosition } : undefined}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/70 to-transparent" />
                    <span
                      className={clsx(
                        'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        phase === 'active'
                          ? 'bg-blue text-white'
                          : phase === 'pre'
                            ? 'bg-surface/90 text-blue'
                            : 'bg-surface/90 text-ink-soft'
                      )}
                    >
                      {PHASE_LABEL[phase]}
                    </span>
                    <div className="pointer-events-none absolute inset-x-4 bottom-3">
                      <p className="font-display text-2xl text-white drop-shadow-sm">{trip.meta.name}</p>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                      <MapPin size={12} />
                      {trip.meta.destinationLabel}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
                      <CalendarDays size={12} />
                      {formatDateCompact(trip.meta.startDate)} – {formatDateCompact(trip.meta.endDate)} · {dayCount} days
                      {phase === 'pre' && countdown > 0 ? ` · ${countdown} day${countdown === 1 ? '' : 's'} away` : ''}
                    </p>

                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
                        <div
                          className="h-full rounded-full bg-blue transition-all"
                          style={{ width: `${readiness.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft">{readiness.percent}% ready</p>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
