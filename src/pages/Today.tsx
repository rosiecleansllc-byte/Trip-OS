import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CloudSun,
  ImageIcon,
  Luggage,
  Maximize2,
  MapPin,
  Navigation,
  Sparkles,
} from 'lucide-react'
import type { ManualTripItem, ScheduleItem, Trip, VisualBoard } from '../types/trip'
import { ActionRow } from '../components/ui/ActionRow'
import { Card } from '../components/ui/Card'
import { OpenItemToggle } from '../components/ui/OpenItemToggle'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Lightbox } from '../components/ui/Lightbox'
import { ManualItemMenu } from '../components/manual/ManualItemMenu'
import { TodayAlertBanner } from '../components/alerts/TodayAlertBanner'
import { TodayWallet } from '../components/today/TodayWallet'
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
import { computeLeaveBy } from '../lib/leaveBy'
import { getTripTimeZone, nowInZone } from '../lib/timezone'
import { useNow } from '../lib/useNow'
import { findDayVisualBoards, useVisualBoardImage } from '../lib/visualBoards'
import { getOutfitBoardsForDay } from '../lib/outfits'
import { OutfitBoardLookCard } from '../components/visuals/OutfitBoardSection'
import { getOutfitsForDay, resolveOutfitItems, type CapsuleItemOverride } from '../lib/wardrobeOutfits'
import { useOutfitDetailUiStore } from '../store/useOutfitDetailUiStore'
import { WardrobeItemThumb } from '../components/wardrobe/WardrobeItemThumb'
import type { Outfit } from '../types/trip'
import { buildWalletDocEntries, sortWalletEntries } from '../lib/walletDocs'
import { getWeatherLocationForDay, isWithinForecastRange, useWeather } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'
import { WeatherCard } from '../components/ui/WeatherCard'

const SCHEDULE_ICON: Record<string, string> = {
  activity: '◆',
  meal: '✦',
  transport: '→',
  free: '·',
  lodging: '⌂',
}

// emphasize=true is the "Next up" slot only — every other schedule card
// on Today (After that/rest of day) stays compact. Travel-time/leave-by
// only ever render there, using computeLeaveBy (lib/leaveBy.ts): never
// invented when the item carries no travelMinutes, and never shown for
// the compact rows where it would just be clutter.
function ScheduleCard({
  item,
  manualItem,
  trip,
  legName,
  emphasize,
}: {
  item: ScheduleItem
  manualItem?: ManualTripItem
  trip: Trip
  legName?: string
  emphasize?: boolean
}) {
  const shareMode = useAppStore((s) => s.shareMode)
  const leaveBy = emphasize ? computeLeaveBy(item.time, item) : undefined
  return (
    <Card className={emphasize ? 'p-4' : 'flex items-start gap-3 p-3.5'} accent={emphasize ? 'blue' : undefined}>
      {emphasize ? (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">
              {formatTime(item.time) ?? 'Anytime'}
            </p>
            <p className={clsx('mt-0.5 text-lg font-medium text-ink', item.cancelled && 'text-ink-soft line-through')}>
              {item.label}
              {item.cancelled && (
                <span className="ml-1.5 rounded-full border border-line bg-bg-soft px-1.5 py-0.5 align-middle text-[9px] font-medium uppercase tracking-wide text-ink-soft no-underline">
                  Canceled
                </span>
              )}
            </p>
            {(item.location || legName) && (
              <p className="mt-0.5 text-xs text-ink-soft">
                {item.location}
                {item.location && legName ? ' · ' : ''}
                {legName}
              </p>
            )}
          </div>
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} trip={trip} className="shrink-0" />}
        </div>
      ) : (
        <>
          <span className="mt-0.5 w-11 shrink-0 text-xs font-medium text-blue">
            {formatTime(item.time) ?? SCHEDULE_ICON[item.type]}
          </span>
          <p className={clsx('min-w-0 flex-1 text-sm font-medium text-ink', item.cancelled && 'text-ink-soft line-through')}>
            {item.label}
            {item.cancelled && (
              <span className="ml-1.5 rounded-full border border-line bg-bg-soft px-1.5 py-0.5 align-middle text-[9px] font-medium uppercase tracking-wide text-ink-soft no-underline">
                Canceled
              </span>
            )}
          </p>
          {!shareMode && manualItem && <ManualItemMenu item={manualItem} trip={trip} className="shrink-0" />}
        </>
      )}
      {emphasize && item.travelMinutes != null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <Navigation size={12} className="text-blue" />
          ~{item.travelMinutes} min away
        </p>
      )}
      {leaveBy && <p className="mt-1 text-sm font-semibold text-blue">Leave by {leaveBy.leaveByLabel}</p>}
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

// A single-line-per-item preview of the next 1-2 items after "Next up" —
// deliberately no ActionRow/menu/notes here, just enough to see what's
// coming without scrolling to the full "Rest of today" list below.
function LaterRow({ item }: { item: ScheduleItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
      <span className="w-11 shrink-0 text-xs font-medium text-blue">{formatTime(item.time) ?? SCHEDULE_ICON[item.type]}</span>
      <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.label}</p>
    </div>
  )
}

// The current, reference-based equivalent of OutfitBoardLookCard, for a
// trip's Outfits (e.g. Austin) rather than its older OutfitBoards
// (France). Tapping the card opens that exact outfit's detail via the
// globally-mounted OutfitDetailSheet — never just a Pack navigation.
function TodayOutfitCard({
  outfit,
  trip,
  eyebrow,
  shareMode,
  visualBoards,
  wardrobeItemOverrides,
  onOpenItem,
}: {
  outfit: Outfit
  trip: Trip
  eyebrow: string
  shareMode: boolean
  visualBoards: VisualBoard[]
  wardrobeItemOverrides: Record<string, CapsuleItemOverride>
  onOpenItem: (src: string, alt: string) => void
}) {
  const openDetail = useOutfitDetailUiStore((s) => s.open)
  // Traveler-uploaded wardrobe-item pieces (title + photo) are excluded
  // entirely in Share mode — same "zero the array" pattern as every
  // other private-upload surface — while a seeded piece's name still
  // shows (only its photo is separately gated inside WardrobeItemThumb).
  const items = resolveOutfitItems(trip, outfit, shareMode ? [] : visualBoards, wardrobeItemOverrides)
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => openDetail(outfit.id)} className="block w-full p-4 text-left">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">{eyebrow}</p>
        <p className="mt-0.5 text-sm font-medium text-ink">{outfit.name}</p>
        {outfit.notes && <p className="mt-1 text-xs text-ink-soft">{outfit.notes}</p>}
      </button>
      {items.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-4">
          {items.map((item) => (
            <WardrobeItemThumb key={item.id} item={item} trip={trip} shareMode={shareMode} size={64} onOpen={onOpenItem} />
          ))}
        </div>
      )}
    </Card>
  )
}

export function Today({ trip }: { trip: Trip }) {
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const shareMode = useAppStore((s) => s.shareMode)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const storeOutfits = useAppStore((s) => s.outfits)
  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const effectiveTrip = useMemo(
    () => getEffectiveTrip(trip, manualItems, resolvedOpenItemIds),
    [trip, manualItems, resolvedOpenItemIds]
  )
  const manualItemsById = useMemo(
    () => new Map(manualItems.filter((i) => i.tripId === trip.meta.id).map((i) => [i.id, i])),
    [manualItems, trip.meta.id]
  )
  // Every "what day/time is it" question on this page is answered against
  // the trip's own destination timezone, not the device's — see
  // lib/timezone.ts. nowInZone returns a Date whose local getters equal
  // the destination's wall clock, so it's a drop-in `now` for the
  // existing lib/date.ts helpers below without changing their signatures.
  // realNow ticks (lib/useNow.ts) so Next Up, leave-by, and the alert
  // banner all advance while the page stays open, not just on whatever
  // unrelated re-render happens to catch a fresh `new Date()`.
  const tz = getTripTimeZone(trip)
  const realNow = useNow()
  const now = nowInZone(tz, realNow)
  const phase = useMemo(() => tripPhase(trip.meta.startDate, trip.meta.endDate, now), [trip, now])
  const today = useMemo(() => findCurrentDay(effectiveTrip.days, now), [effectiveTrip, now])
  const upcoming = useMemo(() => findNextDay(effectiveTrip.days, now), [effectiveTrip, now])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showMoreLooks, setShowMoreLooks] = useState(false)

  const walletEntries = useMemo(() => sortWalletEntries(buildWalletDocEntries(effectiveTrip)), [effectiveTrip])

  // A day's seeded OutfitBoards (see lib/outfits.ts) are the source of
  // truth for what today covers — title, notes, item list — with each
  // item independently matched against the traveler's own uploads (same
  // approach as Pack's master Outfit Board), so a day can show several
  // looks (e.g. Sept 9's Travel Day + Franklin's BBQ) without any one
  // missing photo hiding the rest. Only when a trip has no seeded
  // structure at all for today does an uploaded 'outfit' visual stand in
  // on its own, full-bleed, as before.
  // Current, reference-based Outfits (e.g. Austin) take priority; the
  // OutfitBoard/VisualBoard fallbacks below only ever apply when a day
  // has none (every France day, today). Traveler-created outfits are
  // zeroed out in Share mode — same "zero the array" pattern used
  // everywhere else on this page.
  const todaysOutfits =
    phase === 'active' && today ? getOutfitsForDay(effectiveTrip, shareMode ? [] : storeOutfits, today.id) : []
  const todaysSeededLooks =
    todaysOutfits.length === 0 && phase === 'active' && today ? getOutfitBoardsForDay(effectiveTrip, today) : []
  const todaysUploadedLooks =
    todaysOutfits.length === 0 && !shareMode && phase === 'active' && today
      ? findDayVisualBoards(visualBoards, trip.meta.id, today.id)
      : []
  const fallbackUploadedBoard = todaysSeededLooks.length === 0 ? todaysUploadedLooks[0] : undefined
  const { url: fallbackUploadedUrl } = useVisualBoardImage(fallbackUploadedBoard?.imageKey)
  // Zeroed out in Share mode so OutfitBoardLookCard's item-chip matching
  // never surfaces a traveler's own upload there — mirrors
  // OutfitBoardSection's identical guard in Pack.
  const tripVisualBoards = shareMode ? [] : visualBoards.filter((b) => b.tripId === trip.meta.id)

  // Both weather hooks always run (Rules of Hooks) — only one location is
  // ever defined depending on trip phase, so only one ever actually
  // fetches. Active-trip weather refreshes more often than a pre-trip
  // outlook, which doesn't need to feel live.
  const activeDayLocation =
    phase === 'active' && today ? getWeatherLocationForDay(effectiveTrip, today.id) : undefined
  const activeWeather = useWeather(activeDayLocation, 45)

  const firstDayId = effectiveTrip.days[0]?.id
  const preTripLocation =
    phase === 'pre' && firstDayId ? getWeatherLocationForDay(effectiveTrip, firstDayId) : undefined
  const preTripInRange = Boolean(preTripLocation) && isWithinForecastRange(trip.meta.startDate)
  const preTripWeather = useWeather(preTripInRange ? preTripLocation : undefined, 240)

  if (phase === 'active' && today) {
    const leg = trip.legs.find((l) => l.id === today.legId)
    const deadlines = today.deadlines ?? []
    // A cancelled item (e.g. a canceled flight) is never eligible to be
    // "Next up" — it's kept visible in the day's schedule for the
    // record, but should never look like an active plan the traveler is
    // about to act on. Still appears further down in "Rest of today".
    const { next } = findNextScheduleItem(
      today.scheduleItems.filter((item) => !item.cancelled),
      now
    )
    const afterNext = today.scheduleItems.filter((item) => item.id !== next?.id)
    // Beneath Next Up, show at most the following two items as a compact
    // one-line-each "Later" preview; anything past that still appears in
    // full below under "Rest of today" rather than being hidden.
    const nextTwo = afterNext.slice(0, 2)
    const restOfDay = afterNext.slice(2)
    const dayOpenItems = effectiveTrip.openItems.filter((i) => i.status === 'open' && i.relatedDayId === today.id)
    const todayWalletEntries = walletEntries.filter((e) => e.date === today.date)

    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">
            Day {today.dayNumber} of {trip.days.length} · {leg?.name}
          </p>
          <h1 className="font-display text-2xl text-ink">{today.title}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{formatDateLong(today.date)}</p>
        </div>

        <TodayAlertBanner trip={trip} effectiveTrip={effectiveTrip} now={now} realNow={realNow} />

        {activeDayLocation && <WeatherCard label={activeDayLocation.name} weather={activeWeather} />}

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

        {todaysOutfits.length > 0 ? (
          <div className="space-y-2.5">
            <TodayOutfitCard
              outfit={todaysOutfits[0]}
              trip={trip}
              eyebrow="Today's outfit"
              shareMode={shareMode}
              visualBoards={visualBoards}
              wardrobeItemOverrides={wardrobeItemOverrides}
              onOpenItem={(src) => setLightboxSrc(src)}
            />
            {todaysOutfits.length > 1 && (
              <button
                type="button"
                onClick={() => setShowMoreLooks((v) => !v)}
                className="w-full rounded-full border border-blue/30 bg-blue-tint py-2 text-xs font-medium text-blue"
              >
                {showMoreLooks ? 'Hide other looks' : `${todaysOutfits.length} looks today — see the other one`}
              </button>
            )}
            {showMoreLooks &&
              todaysOutfits.slice(1).map((outfit) => (
                <TodayOutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  trip={trip}
                  eyebrow="Also today"
                  shareMode={shareMode}
                  visualBoards={visualBoards}
                  wardrobeItemOverrides={wardrobeItemOverrides}
                  onOpenItem={(src) => setLightboxSrc(src)}
                />
              ))}
            <Link to="/pack" className="inline-flex items-center gap-1 text-xs font-medium text-blue">
              <Luggage size={13} /> Full outfit board in Pack
            </Link>
          </div>
        ) : todaysSeededLooks.length > 0 ? (
          <div className="space-y-2.5">
            <OutfitBoardLookCard
              board={todaysSeededLooks[0]}
              dayLabel="Today's outfit"
              tripVisualBoards={tripVisualBoards}
              onOpen={(src) => setLightboxSrc(src)}
            />
            {todaysSeededLooks.length > 1 && (
              <button
                type="button"
                onClick={() => setShowMoreLooks((v) => !v)}
                className="w-full rounded-full border border-blue/30 bg-blue-tint py-2 text-xs font-medium text-blue"
              >
                {showMoreLooks ? 'Hide other looks' : `${todaysSeededLooks.length} looks today — see the other one`}
              </button>
            )}
            {showMoreLooks &&
              todaysSeededLooks.slice(1).map((board) => (
                <OutfitBoardLookCard
                  key={board.id}
                  board={board}
                  dayLabel="Also today"
                  tripVisualBoards={tripVisualBoards}
                  onOpen={(src) => setLightboxSrc(src)}
                />
              ))}
            <Link to="/pack" className="inline-flex items-center gap-1 text-xs font-medium text-blue">
              <Luggage size={13} /> Full outfit board in Pack
            </Link>
          </div>
        ) : (
          fallbackUploadedBoard && (
            <Card className="overflow-hidden">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fallbackUploadedUrl && setLightboxSrc(fallbackUploadedUrl)}
                  disabled={!fallbackUploadedUrl}
                  className="flex h-72 w-full items-center justify-center bg-bg-soft"
                >
                  {fallbackUploadedUrl ? (
                    <img src={fallbackUploadedUrl} alt="Today's outfit" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon size={22} className="text-ink-soft" />
                  )}
                </button>
                {fallbackUploadedUrl && (
                  <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-white">
                    <Maximize2 size={13} />
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">Today's outfit</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{fallbackUploadedBoard.title}</p>
                {fallbackUploadedBoard.notes && <p className="mt-1 text-xs text-ink-soft">{fallbackUploadedBoard.notes}</p>}
                <Link to="/pack" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue">
                  <Luggage size={13} /> More visuals in Pack
                </Link>
              </div>
            </Card>
          )
        )}

        {next && (
          <div>
            <SectionHeader eyebrow="Next up" title={next.label} />
            <ScheduleCard item={next} manualItem={manualItemsById.get(next.id)} trip={trip} legName={leg?.name} emphasize />
          </div>
        )}

        {todayWalletEntries.length > 0 && <TodayWallet entries={todayWalletEntries} />}

        {nextTwo.length > 0 && (
          <div>
            <SectionHeader eyebrow="Coming up" title="Later" />
            <div className="space-y-2">
              {nextTwo.map((item) => (
                <LaterRow key={item.id} item={item} />
              ))}
            </div>
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

      <div>
        <SectionHeader eyebrow="Get ready" title="Weather outlook" />
        {preTripInRange && preTripLocation ? (
          <>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Live forecast</p>
            <WeatherCard label={preTripLocation.name} weather={preTripWeather} />
          </>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-ink-soft">Forecast available closer to departure</p>
          </Card>
        )}
        {trip.meta.weatherDisclaimer && (
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Typical conditions</p>
            <p className="mt-1 text-xs text-ink-soft">{trip.meta.weatherDisclaimer}</p>
          </div>
        )}
      </div>

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
