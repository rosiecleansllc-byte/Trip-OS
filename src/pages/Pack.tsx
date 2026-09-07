import { useState } from 'react'
import { clsx } from 'clsx'
import { Check, Maximize2 } from 'lucide-react'
import type { CapsuleCategory, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { Lightbox } from '../components/ui/Lightbox'
import { formatDateCompact } from '../lib/date'
import { useAppStore } from '../store/useAppStore'

const CATEGORY_LABELS: Record<CapsuleCategory, string> = {
  outerwear: 'Outerwear',
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  accessory: 'Accessories',
}

const CATEGORY_ORDER: CapsuleCategory[] = ['outerwear', 'top', 'bottom', 'dress', 'shoes', 'accessory']

function PackingChecklist({ trip }: { trip: Trip }) {
  const packedItems = useAppStore((s) => s.packedItems)
  const togglePacked = useAppStore((s) => s.togglePacked)
  const items = trip.packingList ?? []
  const packedCount = items.filter((item) => packedItems[`${trip.meta.id}:${item.id}`]).length
  const percent = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0

  const categories = Array.from(new Set(items.map((i) => i.category)))

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">
            Packed {packedCount} of {items.length}
          </p>
          <p className="text-xs font-medium text-blue">{percent}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${percent}%` }} />
        </div>
      </Card>

      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category)
        return (
          <div key={category}>
            <SectionHeader eyebrow={`${categoryItems.length} items`} title={category} accent="red" />
            <div className="space-y-2">
              {categoryItems.map((item) => {
                const key = `${trip.meta.id}:${item.id}`
                const packed = Boolean(packedItems[key])
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePacked(trip.meta.id, item.id)}
                    className="block w-full text-left"
                  >
                    <Card className="flex items-center gap-3 p-3.5">
                      <span
                        className={clsx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          packed ? 'border-blue bg-blue text-white' : 'border-line text-transparent'
                        )}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span className={clsx('text-sm', packed ? 'text-ink-soft line-through' : 'text-ink')}>
                        {item.label}
                      </span>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Pack({ trip }: { trip: Trip }) {
  const hasCapsule = trip.capsule.length > 0
  const hasChecklist = (trip.packingList?.length ?? 0) > 0
  const tabs = [
    ...(hasCapsule ? (['capsule', 'outfits'] as const) : []),
    ...(hasChecklist ? (['checklist'] as const) : []),
  ]
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0])
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">What to bring</p>
        <h1 className="font-display text-2xl text-ink">Pack</h1>
      </div>

      {trip.meta.outfitBoardImageUrl && (
        <button
          onClick={() => setLightbox({ src: trip.meta.outfitBoardImageUrl!, alt: `${trip.meta.name} outfit board` })}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
        >
          <Maximize2 size={15} />
          View full outfit board
        </button>
      )}

      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {tabs.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
                tab === key ? 'bg-blue text-white' : 'text-ink-soft'
              )}
            >
              {key === 'capsule' ? 'Capsule wardrobe' : key === 'outfits' ? 'Outfit boards' : 'Checklist'}
            </button>
          ))}
        </div>
      )}

      {tab === 'checklist' && <PackingChecklist trip={trip} />}

      {tab === 'capsule' && (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = trip.capsule.filter((c) => c.category === cat)
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <SectionHeader eyebrow={`${items.length} items`} title={CATEGORY_LABELS[cat]} accent="red" />
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <ImagePlaceholder label={item.name} imageUrl={item.imageUrl} className="h-32 w-full" />
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-ink">{item.name}</p>
                        {item.note && <p className="mt-0.5 text-[11px] text-ink-soft">{item.note}</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'outfits' && (
        <div className="space-y-4">
          {trip.outfitBoards.map((board) => {
            const day = trip.days.find((d) => d.id === board.dayId)
            if (!day) return null
            return (
              <Card key={board.id} className="overflow-hidden">
                <ImagePlaceholder
                  label={`Day ${day.dayNumber} outfit`}
                  imageUrl={board.imageUrl}
                  className="h-56 w-full"
                  onClick={board.imageUrl ? () => setLightbox({ src: board.imageUrl!, alt: `Day ${day.dayNumber} — ${day.title}` }) : undefined}
                />
                <div className="p-4">
                  <p className="text-xs font-medium text-gray">
                    Day {day.dayNumber} · {formatDateCompact(day.date)}
                  </p>
                  <p className="text-sm font-medium text-ink">{day.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">{board.note}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {board.itemNames.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] text-ink-soft"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
