import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CloudSun,
  Luggage,
  Maximize2,
  MapPin,
  Sparkles,
} from 'lucide-react'
import type { ManualTripItem, ScheduleItem, Trip } from '../types/trip'
import { ActionRow } from '../components/ui/ActionRow'
import { Card } from '../components/ui/Card'
import { OpenItemToggle } from '../components/ui/OpenItemToggle'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { Lightbox } from '../components/ui/Lightbox'
import { ManualItemMenu } from '../components/manual/ManualItemMenu'
import {
  daysUntil,
  findCurrentDay,
  findNextDay,
  findNextScheduleItem,
  formatDateLong,
  formatTime,
  tripPhase,
} from '../lib/date'
import { computeReadiness } from '../lib/readiness'
import { getEffectiveTrip } from '../lib/manualItems'
import { useAppStore } from '../store/useAppStore'

const SCHEDULE_ICON: Record<string, string> = {
  activity: '◆',
  meal: '✦',
  transport: '→',
  free: '·',
  lodging: '⌂',
}

function ScheduleCard({
  item,
  manualItem,
  trip,
  emphasize,
}: {
  item: ScheduleItem
  manualItem?: ManualTripItem
  trip: Trip
  emphasize?: boolean
}) {
  const shareMode = useAppStore((s) => s.shareMode)
  return (
    <Card className={emphasize ? 'p-4' : 'flex items-start gap-3 p-3.5'} accent={emphasize ? 'blue' : undefined}>
      {emphasize ? (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">
              {formatTime(item.time) ?? 'Anytime'}
            </p>
            <p className="mt-0.5 text-lg font-medium text-ink">{item.label}</p>
          </div>
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} trip={trip} className="shrink-0" />}
        </div>
      ) : (
        <>
          <span className="mt-0.5 w-11 shrink-0 text-xs font-medium text-blue">
            {formatTime(item.time) ?? SCHEDULE_ICON[item.type]}
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium text-ink">{item.label}</p>
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} trip={trip} className="shrink-0" />}
        </>
      )}
      {!shareMode && item.notes && <p className="mt-1 text-xs text-ink-soft">{item.notes}</p>}
      {item.tip && <p className="mt-1 text-xs italic text-gray">{item.tip}</p>}
      <ActionRow
        location={item.location}
        websiteUrl={item.websiteUrl}
        ticketUrl={item.ticketUrl}
        reservationUrl={item.reservationUrl}
        menuUrl={item.menuUrl}
        phone={item.phone}
        privateTicketUrl={item.privateTicketUrl}
        modifyUrl={item.modifyUrl}
        privateDocumentKey={item.privateDocumentKey}
        privateDocumentLabel={item.privateDocumentLabel}
        privateDocumentType={item.privateDocumentType}
        shareMode={shareMode}
        className="mt-2"
      />
    </Card>
  )
}

export function Today({ trip }: { trip: Trip }) {
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = useMemo(
    () => getEffectiveTrip(trip, manualItems, resolvedOpenItemIds),
    [trip, manualItems, resolvedOpenItemIds]
  )
  const manualItemsById = useMemo(
    () => new Map(manualItems.filter((i) => i.tripId === trip.meta.id).map((i) => [i.id, i])),
    [manualItems, trip.meta.id]
  )
  const phase = useMemo(() => tripPhase(trip.meta.startDate, trip.meta.endDate), [trip])
  const today = useMemo(() => findCurrentDay(effectiveTrip.days), [effectiveTrip])
  const upcoming = useMemo(() => findNextDay(effectiveTrip.days), [effectiveTrip])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  if (phase === 'active' && today) {
    const leg = trip.legs.find((l) => l.id === today.legId)
    const outfitBoard = trip.outfitBoards.find((b) => b.id === today.outfitBoardId)
    const deadlines = today.deadlines ?? []
    const { next, after } = findNextScheduleItem(today.scheduleItems)
    const restOfDay = today.scheduleItems.filter((item) => item.id !== next?.id && item.id !== after?.id)
    const dayOpenItems = effectiveTrip.openItems.filter((i) => i.status === 'open' && i.relatedDayId === today.id)

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

        {dayOpenItems.length > 0 && (
          <div className="space-y-2">
            {dayOpenItems.map((item) => (
              <p key={item.id} className="flex items-start gap-2 rounded-xl bg-red-tint px-3.5 py-2.5 text-xs text-red">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {item.label} still TBD
              </p>
            ))}
          </div>
        )}

        {outfitBoard && (
          <Card className="overflow-hidden">
            <div className="relative">
              <ImagePlaceholder
                label="Today's outfit"
                imageUrl={outfitBoard.imageUrl}
                className="h-72 w-full"
                onClick={outfitBoard.imageUrl ? () => setLightboxSrc(outfitBoard.imageUrl!) : undefined}
              />
              {outfitBoard.imageUrl && (
                <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-white">
                  <Maximize2 size={13} />
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm text-ink">{today.outfitNote}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {outfitBoard.itemNames.map((item) => (
                  <span key={item} className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-ink-soft">
                    {item}
                  </span>
                ))}
              </div>
              <Link to="/pack" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue">
                <Luggage size={13} /> Full capsule in Pack
              </Link>
            </div>
          </Card>
        )}

        {next && (
          <div>
            <SectionHeader eyebrow="Next up" title={next.label} />
            <ScheduleCard item={next} manualItem={manualItemsById.get(next.id)} trip={trip} emphasize />
          </div>
        )}

        {after && (
          <div>
            <SectionHeader eyebrow="After that" title={after.label} />
            <ScheduleCard item={after} manualItem={manualItemsById.get(after.id)} trip={trip} />
          </div>
        )}

        {restOfDay.length > 0 && (
          <div>
            <SectionHeader eyebrow="Schedule" title="Rest of today" />
            <ol className="space-y-2.5">
              {restOfDay.map((item) => (
                <li key={item.id}>
                  <ScheduleCard item={item} manualItem={manualItemsById.get(item.id)} trip={trip} />
                </li>
              ))}
            </ol>
          </div>
        )}

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

        {lightboxSrc && (
          <Lightbox src={lightboxSrc} alt={`${today.title} outfit`} onClose={() => setLightboxSrc(null)} />
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

  // Pre-trip: Trip Readiness dashboard — confirmed items vs. genuinely
  // open ones, computed from the trip's own booking/transport status and
  // OpenItems (lib/readiness.ts), never from whether a document has been
  // loaded into this device's IndexedDB yet.
  const nextDay = upcoming
  const countdown = nextDay ? daysUntil(trip.meta.startDate) : null
  // Readiness is computed only from Booking/Transport status and OpenItems
  // — no cost, confirmation code, note, or private-document field ever
  // feeds into readyLines/openItems (see lib/readiness.ts), so this card
  // is safe to show in Share mode too, same as the rest of the app's
  // "hide specific private fields, not whole sections" rule.
  const { percent, readyLines, openItems } = computeReadiness(effectiveTrip)
  const completedOpenItems = effectiveTrip.openItems.filter((i) => i.status === 'done')

  return (
    <div className="animate-fade-in space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-blue px-5 py-6 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">Next up</p>
          <p className="font-display text-3xl">
            {countdown !== null && countdown > 0 ? `${countdown} days away` : 'Today'}
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

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl text-ink">Trip Ready · {percent}%</p>
          <span
            className={
              percent >= 70
                ? 'rounded-full bg-blue-tint px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-blue'
                : 'rounded-full bg-red-tint px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-red'
            }
          >
            {percent >= 70 ? 'Ready' : 'Needs attention'}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${percent}%` }} />
        </div>

        {readyLines.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {readyLines.map((line) => (
              <p key={line} className="flex items-start gap-2 text-xs text-ink">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-blue" />
                {line}
              </p>
            ))}
          </div>
        )}

        {openItems.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-line pt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Still needed</p>
            {openItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <OpenItemToggle trip={trip} item={item} size={16} />
                <p className="flex-1 text-xs text-ink">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {completedOpenItems.length > 0 && (
          <div className="mt-3 border-t border-line pt-2.5">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft"
            >
              Completed ({completedOpenItems.length})
            </button>
            {showCompleted && (
              <div className="mt-1.5 space-y-1.5">
                {completedOpenItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <OpenItemToggle trip={trip} item={item} size={16} />
                    <p className="flex-1 text-xs text-ink-soft line-through">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              <p className="mt-1 text-xs text-ink-soft">
                {trip.capsule.length > 0 ? 'Review the capsule wardrobe' : 'Review your packing list'}
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
