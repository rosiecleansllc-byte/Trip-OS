import { CheckCircle2, MapPin, RefreshCw, Sparkles } from 'lucide-react'
import type { Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppStore } from '../store/useAppStore'
import { formatDateShort } from '../lib/date'
import { getEffectiveTrip } from '../lib/manualItems'

export function Remember({ trip }: { trip: Trip }) {
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const effectiveTrip = getEffectiveTrip(trip, manualItems, resolvedOpenItemIds)
  const tripManualItems = manualItems.filter((i) => i.tripId === trip.meta.id)

  const cancelled = effectiveTrip.days.flatMap((d) =>
    d.scheduleItems.filter((i) => i.cancelled).map((i) => ({ ...i, date: d.date }))
  )
  const locations = Array.from(
    new Set(
      effectiveTrip.days
        .flatMap((d) => d.scheduleItems.map((i) => i.location).filter(Boolean))
        .map((x) => x as string)
    )
  )

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue">Remember</p>
        <h1 className="font-display text-2xl text-ink">{trip.meta.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          The trip as it actually unfolded — including changes made along the way.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card className="p-3 text-center">
          <p className="font-display text-2xl text-ink">{effectiveTrip.days.length}</p>
          <p className="text-[11px] text-ink-soft">days</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-display text-2xl text-ink">{locations.length}</p>
          <p className="text-[11px] text-ink-soft">places</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-display text-2xl text-ink">{tripManualItems.length}</p>
          <p className="text-[11px] text-ink-soft">changes added</p>
        </Card>
      </div>

      <div>
        <SectionHeader eyebrow="Trip story" title="What happened" action={<Sparkles size={16} className="text-blue" />} />
        <div className="space-y-2.5">
          {effectiveTrip.days.map((day) => (
            <Card key={day.id} className="p-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue" />
                <div>
                  <p className="text-sm font-medium text-ink">{day.title}</p>
                  <p className="text-xs text-ink-soft">{formatDateShort(day.date)}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {day.scheduleItems.filter((i) => !i.cancelled).map((i) => i.label).slice(0, 4).join(' · ')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {(tripManualItems.length > 0 || cancelled.length > 0) && (
        <div>
          <SectionHeader eyebrow="Adapted along the way" title="Plan changes" action={<RefreshCw size={16} className="text-blue" />} />
          <div className="space-y-2.5">
            {tripManualItems.map((item) => (
              <Card key={item.id} className="p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-blue">Added during trip</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-ink-soft">{formatDateShort(item.date)}</p>
              </Card>
            ))}
            {cancelled.map((item) => (
              <Card key={item.id} className="p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">Changed plan</p>
                <p className="mt-0.5 text-sm text-ink line-through">{item.label}</p>
                <p className="text-xs text-ink-soft">{formatDateShort(item.date)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div>
          <SectionHeader eyebrow="Places" title="Where you went" action={<MapPin size={16} className="text-blue" />} />
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {locations.slice(0, 24).map((location) => (
                <span key={location} className="rounded-full bg-bg-soft px-2.5 py-1 text-xs text-ink-soft">
                  {location}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
