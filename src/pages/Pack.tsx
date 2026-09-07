import { useState } from 'react'
import { clsx } from 'clsx'
import type { CapsuleCategory, Trip } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { formatDateCompact } from '../lib/date'

const CATEGORY_LABELS: Record<CapsuleCategory, string> = {
  outerwear: 'Outerwear',
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  accessory: 'Accessories',
}

const CATEGORY_ORDER: CapsuleCategory[] = ['outerwear', 'top', 'bottom', 'dress', 'shoes', 'accessory']

export function Pack({ trip }: { trip: Trip }) {
  const [tab, setTab] = useState<'capsule' | 'outfits'>('capsule')

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray">What to bring</p>
        <h1 className="font-display text-2xl text-ink">Pack</h1>
      </div>

      <div className="flex gap-1 rounded-full border border-line bg-paper p-1">
        {(['capsule', 'outfits'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
              tab === key ? 'bg-blue text-ivory' : 'text-ink-soft'
            )}
          >
            {key === 'capsule' ? 'Capsule wardrobe' : 'Outfit boards'}
          </button>
        ))}
      </div>

      {tab === 'capsule' ? (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = trip.capsule.filter((c) => c.category === cat)
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <SectionHeader eyebrow={`${items.length} items`} title={CATEGORY_LABELS[cat]} />
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <ImagePlaceholder label={item.name} imageUrl={item.imageUrl} className="h-24 w-full" />
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
      ) : (
        <div className="space-y-4">
          {trip.outfitBoards.map((board) => {
            const day = trip.days.find((d) => d.id === board.dayId)
            if (!day) return null
            return (
              <Card key={board.id} className="p-4">
                <div className="flex items-start gap-3">
                  <ImagePlaceholder
                    label="Outfit photo"
                    imageUrl={board.imageUrl}
                    className="h-20 w-16 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray">
                      Day {day.dayNumber} · {formatDateCompact(day.date)}
                    </p>
                    <p className="text-sm font-medium text-ink">{day.title}</p>
                    <p className="mt-1 text-xs text-ink-soft">{board.note}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {board.itemNames.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-ivory px-2.5 py-1 text-[11px] text-ink-soft"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
