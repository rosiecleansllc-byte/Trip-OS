import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { clsx } from 'clsx'
import type { Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { WeatherCard } from '../components/ui/WeatherCard'
import { daysUntil, formatDateLong, tripPhase } from '../lib/date'
import { computeReadiness } from '../lib/readiness'
import { getEffectiveTrip } from '../lib/manualItems'
import { getWeatherLocationForDay, isWithinForecastRange, useWeather } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

const PHASE_LABEL: Record<'pre' | 'active' | 'post', string> = {
  pre: 'Upcoming',
  active: 'In progress',
  post: 'Completed',
}

// The trip's cover/landing page — a quiet "open the passport" moment
// before diving into Today's operational view, reached by tapping a trip
// on Trips Home (see TripsHome.tsx) rather than jumping straight into
// /today. Read-only: nothing here mutates trip state, so it needs no
// extra Share-mode handling beyond what AppShell already does (hiding the
// add/edit FAB) — cover art, dates, readiness, and weather are all public.
export function Overview({ trip }: { trip: Trip }) {
  const navigate = useNavigate()
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)

  const phase = tripPhase(trip.meta.startDate, trip.meta.endDate)
  const countdown = daysUntil(trip.meta.startDate)
  const readiness = computeReadiness(effectiveTrip)

  const primaryLocation = getWeatherLocationForDay(effectiveTrip, effectiveTrip.days[0]?.id ?? '')
  const inRange = Boolean(primaryLocation) && isWithinForecastRange(trip.meta.startDate)
  const weather = useWeather(inRange ? primaryLocation : undefined)

  return (
    <div className="animate-fade-in -mx-4 -mt-4">
      <div className="relative h-72 w-full overflow-hidden">
        <ImagePlaceholder
          label={trip.meta.coverAlt ?? `${trip.meta.name} cover artwork`}
          imageUrl={trip.meta.coverImageUrl}
          fit="cover"
          className="h-full w-full"
          style={trip.meta.coverPosition ? { objectPosition: trip.meta.coverPosition } : undefined}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/60 to-transparent" />
        <span
          className={clsx(
            'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium',
            phase === 'active' ? 'bg-blue text-white' : 'bg-surface/90 text-ink-soft'
          )}
        >
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className="space-y-5 px-4 pb-6 pt-5">
        <div>
          <h1 className="font-display text-3xl text-ink">{trip.meta.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin size={14} className="text-blue" />
            {trip.meta.destinationLabel}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <CalendarDays size={14} className="text-blue" />
            {formatDateLong(trip.meta.startDate)} — {formatDateLong(trip.meta.endDate)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <Users size={14} className="text-blue" />
            {trip.meta.travelers.length} traveler{trip.meta.travelers.length === 1 ? '' : 's'}
          </p>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              {phase === 'active'
                ? 'In progress'
                : phase === 'post'
                  ? 'Completed'
                  : countdown > 0
                    ? `${countdown} day${countdown === 1 ? '' : 's'} away`
                    : 'Today'}
            </p>
            <p className="text-sm font-medium text-blue">{readiness.percent}% ready</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
            <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${readiness.percent}%` }} />
          </div>
        </Card>

        {primaryLocation &&
          (inRange ? (
            <WeatherCard label={primaryLocation.name} weather={weather} compact />
          ) : (
            <Card className="p-3">
              <p className="text-xs text-ink-soft">Live forecast available closer to departure</p>
            </Card>
          ))}

        <button
          type="button"
          onClick={() => navigate('/today')}
          className="w-full rounded-full bg-blue py-3.5 text-sm font-medium text-white"
        >
          Enter Trip
        </button>

        <div className="grid grid-cols-3 gap-2.5">
          <Link to="/today">
            <Card className="p-3 text-center">
              <p className="text-xs font-medium text-ink">Today</p>
            </Card>
          </Link>
          <Link to="/trip">
            <Card className="p-3 text-center">
              <p className="text-xs font-medium text-ink">Full Trip</p>
            </Card>
          </Link>
          <Link to="/bookings">
            <Card className="p-3 text-center">
              <p className="text-xs font-medium text-ink">Bookings</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
