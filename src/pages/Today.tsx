import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, CloudSun, MapPin, Navigation, ShoppingBag, Sparkles } from 'lucide-react'
import type { Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { daysUntil, findCurrentDay, findNextDay, formatDateLong, formatTime, tripPhase } from '../lib/date'
import { useAppStore } from '../store/useAppStore'

const SCHEDULE_ICON: Record<string, string> = {
  activity: '◆',
  meal: '✦',
  transport: '→',
  free: '·',
  lodging: '⌂',
}

function directionsUrl(place?: string) {
  if (!place) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
}

export function Today({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const phase = useMemo(() => tripPhase(trip.meta.startDate, trip.meta.endDate), [trip])
  const today = useMemo(() => findCurrentDay(trip.days), [trip])
  const upcoming = useMemo(() => findNextDay(trip.days), [trip])

  if (phase === 'active' && today) {
    const leg = trip.legs.find((l) => l.id === today.legId)
    const outfitBoard = trip.outfitBoards.find((b) => b.id === today.outfitBoardId)
    const deadlines = today.deadlines ?? []

    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">
            Day {today.dayNumber} of {trip.days.length} · {leg?.name}
          </p>
          <h1 className="font-display text-2xl text-ink">{today.title}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{formatDateLong(today.date)}</p>
        </div>

        {today.weatherNote && (
          <p className="flex items-start gap-2 rounded-xl bg-blue-tint px-3.5 py-2.5 text-xs text-blue">
            <CloudSun size={14} className="mt-0.5 shrink-0" />
            {today.weatherNote}
          </p>
        )}

        <Card className="p-4">
          <SectionHeader eyebrow="Today's outfit" title={today.outfitNote} />
          <div className="flex gap-3">
            <ImagePlaceholder
              label="Outfit photo"
              imageUrl={outfitBoard?.imageUrl}
              className="h-24 w-20 shrink-0 rounded-xl"
            />
            <div className="flex flex-1 flex-wrap content-start gap-1.5">
              {outfitBoard?.itemNames.map((item) => (
                <span key={item} className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-ink-soft">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Link
            to="/pack"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue"
          >
            <ShoppingBag size={13} /> Full capsule in Pack
          </Link>
        </Card>

        <div>
          <SectionHeader eyebrow="Schedule" title="Today's plan" />
          <ol className="space-y-2.5">
            {today.scheduleItems.map((item) => (
              <li key={item.id}>
                <Card className="flex items-start gap-3 p-3.5">
                  <span className="mt-0.5 w-11 shrink-0 text-xs font-medium text-blue">
                    {formatTime(item.time) ?? SCHEDULE_ICON[item.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{item.label}</p>
                    {item.location && (
                      <a
                        href={directionsUrl(item.location)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue"
                      >
                        <Navigation size={12} /> Directions
                      </a>
                    )}
                    {!shareMode && item.notes && <p className="mt-1 text-xs text-ink-soft">{item.notes}</p>}
                    {item.tip && <p className="mt-1 text-xs italic text-gray">{item.tip}</p>}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </div>

        {deadlines.length > 0 && (
          <div>
            <SectionHeader eyebrow="Don't miss" title="Deadlines today" />
            <div className="space-y-2">
              {deadlines.map((d) => (
                <Card
                  key={d.id}
                  accent={d.done ? undefined : 'red'}
                  className="flex items-center gap-2.5 p-3 text-sm"
                >
                  {d.done ? (
                    <CheckCircle2 size={16} className="text-blue" />
                  ) : (
                    <Circle size={16} className="text-red" />
                  )}
                  <span className="flex-1 text-ink">{d.label}</span>
                  <span className="text-xs text-ink-soft">{formatTime(d.datetime.slice(11, 16))}</span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'post') {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-3 pt-16 text-center">
        <Sparkles className="text-blue" size={28} />
        <h1 className="font-display text-2xl text-ink">{trip.meta.name} is in the books</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Revisit the full itinerary any time in the Trip tab, or start planning the next one.
        </p>
        <Link
          to="/trip"
          className="mt-2 rounded-full bg-blue px-5 py-2 text-sm font-medium text-white"
        >
          Relive the timeline
        </Link>
      </div>
    )
  }

  // Pre-trip: show the next upcoming item.
  const nextDay = upcoming
  const countdown = nextDay ? daysUntil(trip.meta.startDate) : null

  return (
    <div className="animate-fade-in space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-blue px-5 py-6 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">Next up</p>
          <p className="font-display text-3xl">
            {countdown !== null && countdown > 0 ? `${countdown} days` : 'Today'}
          </p>
          <p className="mt-1 text-sm text-white/85">until {trip.meta.name} begins</p>
        </div>
        <div className="p-4 text-sm text-ink-soft">
          <p className="flex items-center gap-1.5">
            <MapPin size={14} className="text-blue" />
            {trip.meta.destinationLabel}
          </p>
          <p className="mt-1">{formatDateLong(trip.meta.startDate)} — {formatDateLong(trip.meta.endDate)}</p>
        </div>
      </Card>

      {nextDay && (
        <div>
          <SectionHeader eyebrow="First up" title={nextDay.title} />
          <Card className="p-4">
            <p className="text-sm text-ink-soft">{formatDateLong(nextDay.date)}</p>
            <p className="mt-2 text-sm text-ink">{nextDay.outfitNote}</p>
          </Card>
        </div>
      )}

      <div>
        <SectionHeader eyebrow="Get ready" title="Before you go" />
        <div className="grid grid-cols-2 gap-3">
          <Link to="/bookings">
            <Card className="p-4">
              <p className="text-sm font-medium text-ink">Bookings</p>
              <p className="mt-1 text-xs text-ink-soft">Check what's still pending</p>
            </Card>
          </Link>
          <Link to="/pack">
            <Card className="p-4">
              <p className="text-sm font-medium text-ink">Pack</p>
              <p className="mt-1 text-xs text-ink-soft">Review the capsule wardrobe</p>
            </Card>
          </Link>
        </div>
      </div>

      {trip.prepItems.length > 0 && (
        <div>
          <SectionHeader eyebrow={`${trip.prepItems.length} left`} title="Still open" />
          <div className="space-y-2">
            {trip.prepItems.map((item) => (
              <Card key={item.id} className="flex items-start gap-2.5 p-3.5">
                <Circle size={15} className="mt-0.5 shrink-0 text-red" />
                <div>
                  <p className="text-sm text-ink">{item.label}</p>
                  {item.detail && <p className="mt-0.5 text-xs text-ink-soft">{item.detail}</p>}
                </div>
              </Card>
            ))}
          </div>
          <Link to="/bookings" className="mt-2 inline-block text-xs font-medium text-blue">
            Full list in Bookings
          </Link>
        </div>
      )}
    </div>
  )
}
