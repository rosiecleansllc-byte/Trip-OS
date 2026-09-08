import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, CloudSun } from 'lucide-react'
import { clsx } from 'clsx'
import type { Trip } from '../types/trip'
import { ActionRow } from '../components/ui/ActionRow'
import { Card } from '../components/ui/Card'
import { ManualItemMenu } from '../components/manual/ManualItemMenu'
import { formatDateShort, isSameISODate } from '../lib/date'
import { useAppStore } from '../store/useAppStore'
import { getEffectiveTrip } from '../lib/manualItems'
import {
  describeWeatherCode,
  forecastForDate,
  getWeatherLocationForDay,
  getWeather,
  type WeatherSnapshot,
} from '../lib/weather'

export function TripPage({ trip }: { trip: Trip }) {
  const shareMode = useAppStore((s) => s.shareMode)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const manualItemsById = new Map(manualItems.filter((i) => i.tripId === trip.meta.id).map((i) => [i.id, i]))
  const [openDay, setOpenDay] = useState<string | null>(
    effectiveTrip.days.find((d) => isSameISODate(d.date))?.id ?? effectiveTrip.days[0]?.id ?? null
  )

  // One fetch per unique weather location (2-3 for these trips), not one
  // per day row — every day resolves its own location via
  // getWeatherLocationForDay and looks it up in this map, so a 12-day
  // itinerary still only makes as many requests as there are distinct
  // places. Cached individually by lib/weather.ts's own localStorage
  // cache, so this is cheap on repeat visits regardless.
  const [weatherByLocation, setWeatherByLocation] = useState<Record<string, WeatherSnapshot>>({})
  useEffect(() => {
    const locations = trip.weatherLocations ?? []
    if (locations.length === 0) return
    let cancelled = false
    Promise.all(
      locations.map((loc) =>
        getWeather(loc, { ttlMinutes: 240 })
          .then((snap) => [loc.id, snap] as const)
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, WeatherSnapshot> = {}
      for (const r of results) if (r) map[r[0]] = r[1]
      setWeatherByLocation(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.meta.id])

  const legHeaderDayIds = useMemo(() => {
    const ids = new Set<string>()
    let lastLegId: string | null = null
    for (const day of effectiveTrip.days) {
      if (day.legId !== lastLegId) {
        ids.add(day.id)
        lastLegId = day.legId
      }
    }
    return ids
  }, [effectiveTrip.days])

  return (
    <div className="animate-fade-in space-y-1">
      <div className="mb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">The full itinerary</p>
        <h1 className="font-display text-2xl text-ink">{trip.meta.name}</h1>
        <p className="mt-0.5 text-sm text-ink-soft">
          {effectiveTrip.days.length} days · {trip.legs.length} stops
        </p>
      </div>

      {trip.meta.weatherDisclaimer && (
        <div className="mb-5 flex gap-2.5 rounded-2xl border border-line bg-bg-soft p-3.5 text-xs text-ink-soft">
          <CloudSun size={16} className="mt-0.5 shrink-0 text-blue" />
          <p>{trip.meta.weatherDisclaimer}</p>
        </div>
      )}

      <ol className="relative border-l-2 border-blue/25 pl-5">
        {effectiveTrip.days.map((day) => {
          const leg = trip.legs.find((l) => l.id === day.legId)
          const showLegHeader = legHeaderDayIds.has(day.id)
          const isToday = isSameISODate(day.date)
          const isOpen = openDay === day.id
          const hasOpenDeadline = (day.deadlines ?? []).some((d) => !d.done)
          const dayLocation = getWeatherLocationForDay(effectiveTrip, day.id)
          const dayForecast = dayLocation ? forecastForDate(weatherByLocation[dayLocation.id], day.date) : undefined

          return (
            <li key={day.id} className="relative">
              {showLegHeader && (
                <p className="-ml-5 mb-2 mt-5 pl-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue first:mt-0">
                  {leg!.name}
                </p>
              )}
              <span
                className={clsx(
                  'absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2',
                  isToday
                    ? 'border-blue bg-blue'
                    : hasOpenDeadline
                      ? 'border-red bg-surface'
                      : 'border-line bg-surface'
                )}
              />
              <Card className={clsx('mb-3 p-4 transition-colors', isToday && 'border-blue/50 bg-blue-tint/40')}>
                <button
                  onClick={() => setOpenDay(isOpen ? null : day.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-medium text-gray">
                        Day {day.dayNumber} · {formatDateShort(day.date)}
                        {dayForecast && (
                          <span className="text-ink-soft">
                            · {dayForecast.highF}° / {dayForecast.lowF}° {describeWeatherCode(dayForecast.code).emoji}
                          </span>
                        )}
                      </p>
                      <h3 className="font-display text-lg text-ink">{day.title}</h3>
                    </div>
                    <ChevronDown
                      size={18}
                      className={clsx('mt-1 shrink-0 text-gray transition-transform', isOpen && 'rotate-180')}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{day.outfitNote}</p>
                </button>

                {isOpen && (
                  <>
                    {day.weatherNote && (
                      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-blue-tint px-2.5 py-1.5 text-xs text-blue">
                        <CloudSun size={13} className="mt-0.5 shrink-0" />
                        {day.weatherNote}
                      </p>
                    )}
                    <ul className="mt-3 space-y-2.5 border-t border-line pt-3">
                      {day.scheduleItems.map((item) => (
                        <li key={item.id} className="flex gap-2.5 text-sm">
                          <span className="w-11 shrink-0 text-xs text-blue">{item.time ?? ''}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-ink">{item.label}</p>
                              {!shareMode && manualItemsById.has(item.id) && (
                                <ManualItemMenu item={manualItemsById.get(item.id)!} trip={trip} className="shrink-0" />
                              )}
                            </div>
                            {!shareMode && item.notes && <p className="text-xs text-ink-soft">{item.notes}</p>}
                            {item.tip && <p className="text-xs italic text-gray">{item.tip}</p>}
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
                              className="mt-1.5"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
