import { useCallback, useEffect, useRef, useState } from 'react'
import type { Trip, WeatherLocation } from '../types/trip'

// Live weather for a trip, via Open-Meteo (https://open-meteo.com) — no
// API key, so nothing to keep secret or proxy through a serverless
// function. Every page reads weather through this file (getWeather /
// useWeather) rather than calling fetch or knowing Open-Meteo's response
// shape directly, so the provider could be swapped later without
// touching a single page.
//
// This sits alongside the trip's existing static prose (DayPlan.weatherNote,
// TripMeta.weatherDisclaimer) rather than replacing it — those remain
// useful "typical conditions" planning guidance when a trip is too far out
// for a real forecast, and pages that show both are expected to label them
// distinctly from live data.

export const WEATHER_FORECAST_HORIZON_DAYS = 16

export interface DailyForecast {
  date: string // ISODate
  highF: number
  lowF: number
  code: number // WMO weather code
  precipitationChance?: number // 0-100
}

export interface CurrentWeather {
  tempF: number
  feelsLikeF: number
  code: number
  precipitationChance?: number // 0-100, today's max — Open-Meteo has no true "current" probability
}

export interface WeatherSnapshot {
  locationId: string
  fetchedAt: string // ISO timestamp
  current?: CurrentWeather
  daily: DailyForecast[]
}

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Clear', emoji: '☀️' },
  1: { label: 'Mostly clear', emoji: '🌤️' },
  2: { label: 'Partly cloudy', emoji: '⛅' },
  3: { label: 'Cloudy', emoji: '☁️' },
  45: { label: 'Foggy', emoji: '🌫️' },
  48: { label: 'Foggy', emoji: '🌫️' },
  51: { label: 'Light drizzle', emoji: '🌦️' },
  53: { label: 'Drizzle', emoji: '🌦️' },
  55: { label: 'Heavy drizzle', emoji: '🌦️' },
  56: { label: 'Freezing drizzle', emoji: '🌧️' },
  57: { label: 'Freezing drizzle', emoji: '🌧️' },
  61: { label: 'Light rain', emoji: '🌧️' },
  63: { label: 'Rain', emoji: '🌧️' },
  65: { label: 'Heavy rain', emoji: '🌧️' },
  66: { label: 'Freezing rain', emoji: '🌧️' },
  67: { label: 'Freezing rain', emoji: '🌧️' },
  71: { label: 'Light snow', emoji: '❄️' },
  73: { label: 'Snow', emoji: '❄️' },
  75: { label: 'Heavy snow', emoji: '❄️' },
  77: { label: 'Snow grains', emoji: '❄️' },
  80: { label: 'Rain showers', emoji: '🌦️' },
  81: { label: 'Rain showers', emoji: '🌦️' },
  82: { label: 'Heavy showers', emoji: '🌦️' },
  85: { label: 'Snow showers', emoji: '🌨️' },
  86: { label: 'Snow showers', emoji: '🌨️' },
  95: { label: 'Thunderstorm', emoji: '⛈️' },
  96: { label: 'Thunderstorm', emoji: '⛈️' },
  99: { label: 'Thunderstorm', emoji: '⛈️' },
}

export function describeWeatherCode(code: number): { label: string; emoji: string } {
  return WMO_CODES[code] ?? { label: 'Weather', emoji: '🌡️' }
}

// A day's weather location is whichever WeatherLocation's relatedLegId
// covers that day's leg — walking backward through the itinerary to the
// most recent day with a direct match when the day's own leg has none
// (e.g. a travel/departure day), so every day resolves to *some* location
// without needing an entry for every leg. Never matches by label text.
export function getWeatherLocationForLeg(trip: Trip, legId: string | undefined): WeatherLocation | undefined {
  if (!legId) return undefined
  return (trip.weatherLocations ?? []).find((loc) => {
    if (!loc.relatedLegId) return false
    return Array.isArray(loc.relatedLegId) ? loc.relatedLegId.includes(legId) : loc.relatedLegId === legId
  })
}

export function getWeatherLocationForDay(trip: Trip, dayId: string): WeatherLocation | undefined {
  const locations = trip.weatherLocations ?? []
  if (locations.length === 0) return undefined
  const dayIndex = trip.days.findIndex((d) => d.id === dayId)
  if (dayIndex === -1) return locations[0]
  for (let i = dayIndex; i >= 0; i--) {
    const match = getWeatherLocationForLeg(trip, trip.days[i].legId)
    if (match) return match
  }
  return locations[0]
}

export function forecastForDate(snapshot: WeatherSnapshot | undefined, dateISO: string): DailyForecast | undefined {
  return snapshot?.daily.find((d) => d.date === dateISO)
}

// Whether dateISO falls within Open-Meteo's forecast window — never
// fabricate weather for a date the API itself wouldn't return real data
// for.
export function isWithinForecastRange(dateISO: string, now: Date = new Date()): boolean {
  const target = new Date(`${dateISO}T00:00:00`)
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
  return diffDays >= -1 && diffDays <= WEATHER_FORECAST_HORIZON_DAYS
}

export function minutesAgoLabel(date: Date, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`
}

// ---- fetch + cache ---------------------------------------------------

const CACHE_KEY = 'trip-os-weather-cache'
const DEFAULT_TTL_MINUTES = 45

interface WeatherCacheEntry {
  fetchedAt: string
  snapshot: WeatherSnapshot
}

function readCache(): Record<string, WeatherCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, WeatherCacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full or unavailable — weather just isn't cached this
    // session; every page already tolerates a plain re-fetch.
  }
}

function getCached(locationId: string, ttlMinutes: number): WeatherSnapshot | undefined {
  const entry = readCache()[locationId]
  if (!entry) return undefined
  const ageMs = Date.now() - new Date(entry.fetchedAt).getTime()
  if (ageMs > ttlMinutes * 60_000) return undefined
  return entry.snapshot
}

function setCached(locationId: string, snapshot: WeatherSnapshot) {
  const cache = readCache()
  cache[locationId] = { fetchedAt: snapshot.fetchedAt, snapshot }
  writeCache(cache)
}

async function fetchFromOpenMeteo(location: WeatherLocation): Promise<WeatherSnapshot> {
  if (location.latitude == null || location.longitude == null) {
    throw new Error(`"${location.name}" has no coordinates`)
  }
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    forecast_days: String(WEATHER_FORECAST_HORIZON_DAYS),
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`)
  const data = await res.json()

  const dailyDates: string[] = data.daily?.time ?? []
  const daily: DailyForecast[] = dailyDates.map((date, i) => ({
    date,
    highF: Math.round(data.daily.temperature_2m_max[i]),
    lowF: Math.round(data.daily.temperature_2m_min[i]),
    code: data.daily.weather_code[i],
    precipitationChance: data.daily.precipitation_probability_max?.[i],
  }))

  const current: CurrentWeather | undefined = data.current
    ? {
        tempF: Math.round(data.current.temperature_2m),
        feelsLikeF: Math.round(data.current.apparent_temperature),
        code: data.current.weather_code,
        // Open-Meteo's "current" block has no probability field — today's
        // daily max is the closest honest proxy for "chance of rain".
        precipitationChance: daily[0]?.precipitationChance,
      }
    : undefined

  return { locationId: location.id, fetchedAt: new Date().toISOString(), current, daily }
}

// Fetches a location's weather, serving a cached snapshot when one is
// fresh enough. Callers pick the TTL: shorter for active-trip "right now"
// weather, longer for a pre-trip outlook that doesn't need to feel live.
export async function getWeather(
  location: WeatherLocation,
  opts: { ttlMinutes?: number; force?: boolean } = {}
): Promise<WeatherSnapshot> {
  const ttlMinutes = opts.ttlMinutes ?? DEFAULT_TTL_MINUTES
  if (!opts.force) {
    const cached = getCached(location.id, ttlMinutes)
    if (cached) return cached
  }
  const snapshot = await fetchFromOpenMeteo(location)
  setCached(location.id, snapshot)
  return snapshot
}

// ---- React hook --------------------------------------------------------

export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseWeatherResult {
  status: WeatherStatus
  snapshot: WeatherSnapshot | undefined
  error: string | undefined
  refresh: () => void
  lastUpdatedAt: Date | undefined
}

// Fetches on mount and whenever the location changes; never polls. All
// state updates happen inside the fetch promise's own then/catch, not
// synchronously in the effect body, so status is derived at render time
// rather than stored — this is a plain "synchronize with an external
// system" effect, not a fetch-then-setState-immediately pattern.
export function useWeather(location: WeatherLocation | undefined, ttlMinutes = DEFAULT_TTL_MINUTES): UseWeatherResult {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [fetchToken, setFetchToken] = useState(0)
  const forceRef = useRef(false)
  const locationId = location?.id

  useEffect(() => {
    if (!location) return
    const force = forceRef.current
    forceRef.current = false
    let cancelled = false
    getWeather(location, { ttlMinutes, force })
      .then((snap) => {
        if (cancelled) return
        setSnapshot(snap)
        setError(undefined)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Weather unavailable')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, fetchToken])

  const refresh = useCallback(() => {
    forceRef.current = true
    setFetchToken((t) => t + 1)
  }, [])

  const ready = Boolean(snapshot && locationId && snapshot.locationId === locationId)
  const status: WeatherStatus = !location ? 'idle' : ready ? 'ready' : error ? 'error' : 'loading'

  return {
    status,
    snapshot: ready ? snapshot : undefined,
    error,
    refresh,
    lastUpdatedAt: ready && snapshot ? new Date(snapshot.fetchedAt) : undefined,
  }
}
