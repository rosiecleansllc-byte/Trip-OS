import { useState } from 'react'
import { clsx } from 'clsx'
import { Check, ImageIcon, Maximize2, Plus } from 'lucide-react'
import type { CapsuleCategory, Trip, VisualBoardType } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { Lightbox } from '../components/ui/Lightbox'
import { WeatherCard } from '../components/ui/WeatherCard'
import { AddVisualBoardSheet } from '../components/visuals/AddVisualBoardSheet'
import { VisualBoardCard } from '../components/visuals/VisualBoardCard'
import { AddOutfitLookSheet } from '../components/visuals/AddOutfitLookSheet'
import { OutfitLookCard } from '../components/visuals/OutfitLookCard'
import { OutfitBoardSection } from '../components/visuals/OutfitBoardSection'
import { CapsuleItemImage } from '../components/pack/CapsuleItemImage'
import { getWeatherLocationForDay, isWithinForecastRange, useWeather } from '../lib/weather'
import { sortVisualBoards } from '../lib/visualBoards'
import { sortOutfitLooks } from '../lib/outfits'
import { useAppStore } from '../store/useAppStore'
import { useVisualBoardUiStore } from '../store/useVisualBoardUiStore'
import { useOutfitLookUiStore } from '../store/useOutfitLookUiStore'

const OUTFIT_TIER: VisualBoardType[] = ['outfit']
const CAPSULE_TIER: VisualBoardType[] = ['capsule', 'packing']
const SHOES_TIER: VisualBoardType[] = ['shoes']
const ACCESSORIES_TIER: VisualBoardType[] = ['accessories']
const OTHER_TIER: VisualBoardType[] = ['mood', 'city', 'other']

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

type PackTab = 'capsule' | 'outfits' | 'checklist' | 'visuals'

export function Pack({ trip }: { trip: Trip }) {
  const hasCapsule = trip.capsule.length > 0
  const hasChecklist = (trip.packingList?.length ?? 0) > 0
  const shareMode = useAppStore((s) => s.shareMode)
  // "Visuals" is always present outside Share mode — Austin has no seeded
  // capsule/outfit data at all, and every trip (seeded or not) should
  // still be able to hold traveler-uploaded boards. Hidden entirely in
  // Share mode, same as the per-board Add/Edit/Replace/Delete controls it
  // hosts.
  const tabs: PackTab[] = [
    ...(hasCapsule ? (['capsule', 'outfits'] as const) : []),
    ...(hasChecklist ? (['checklist'] as const) : []),
    ...(shareMode ? [] : (['visuals'] as const)),
  ]
  const [tab, setTab] = useState<PackTab>(tabs[0])
  // The selected tab is stored as plain state, but never trusted directly
  // for rendering — Share mode can turn on while 'visuals' is selected,
  // which would otherwise keep rendering private uploaded boards even
  // though the tab button itself has disappeared from `tabs`. Deriving
  // the effective tab at render time (falling back to the first still-
  // valid tab) closes that gap without an effect: there's nothing to
  // synchronize, just a value that's only ever used when it's still
  // actually selectable. If Share mode later turns back off, `tab` is
  // still 'visuals' underneath, so the traveler's original selection
  // naturally comes back — this only ever hides content, never forgets
  // a private-mode-safe choice.
  const activeTab: PackTab | undefined = tabs.includes(tab) ? tab : tabs[0]
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const openPicker = useVisualBoardUiStore((s) => s.openPicker)
  const outfitLooks = useAppStore((s) => s.outfitLooks)
  const openNewLook = useOutfitLookUiStore((s) => s.openNew)
  const tripVisualBoards = sortVisualBoards(visualBoards.filter((b) => b.tripId === trip.meta.id))
  const outfitBoards = tripVisualBoards.filter((b) => OUTFIT_TIER.includes(b.type))
  const capsulePackingBoards = tripVisualBoards.filter((b) => CAPSULE_TIER.includes(b.type))
  const shoesBoards = tripVisualBoards.filter((b) => SHOES_TIER.includes(b.type))
  const accessoriesBoards = tripVisualBoards.filter((b) => ACCESSORIES_TIER.includes(b.type))
  const otherBoards = tripVisualBoards.filter((b) => OTHER_TIER.includes(b.type))
  const tripOutfitLooks = sortOutfitLooks(outfitLooks.filter((l) => l.tripId === trip.meta.id))

  // Context only — this never rewrites the packing list or outfits, it
  // just gives Cecilia a sense of what to expect before she reads the
  // checklist below.
  const location = getWeatherLocationForDay(trip, trip.days[0]?.id ?? '')
  const inRange = Boolean(location) && isWithinForecastRange(trip.meta.startDate)
  const weather = useWeather(inRange ? location : undefined, 240)

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">What to bring</p>
        <h1 className="font-display text-2xl text-ink">Pack</h1>
      </div>

      {location && inRange && <WeatherCard label={`${location.name} outlook`} weather={weather} compact />}

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
                activeTab === key ? 'bg-blue text-white' : 'text-ink-soft'
              )}
            >
              {key === 'capsule'
                ? 'Capsule wardrobe'
                : key === 'outfits'
                  ? 'Outfit boards'
                  : key === 'visuals'
                    ? 'Visuals'
                    : 'Checklist'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'checklist' && <PackingChecklist trip={trip} />}

      {activeTab === 'capsule' && (
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
                      {shareMode ? (
                        <ImagePlaceholder label={item.name} imageUrl={item.imageUrl} className="h-32 w-full" />
                      ) : (
                        <CapsuleItemImage item={item} trip={trip} className="h-32 w-full" />
                      )}
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

      {activeTab === 'outfits' && (
        <div className="space-y-6">
          <OutfitBoardSection trip={trip} />

          {/* Freely-editable custom looks (see types/trip.ts OutfitLook) —
              never seeded, purely traveler-created by linking whatever
              they've already uploaded above. Hidden entirely in Share
              mode along with the control to add one, same as every other
              uploaded/private surface in Pack. */}
          {!shareMode && (
            <div>
              <SectionHeader
                eyebrow={`${tripOutfitLooks.length} look${tripOutfitLooks.length === 1 ? '' : 's'}`}
                title="Your outfit looks"
                accent="red"
              />
              <button
                type="button"
                onClick={openNewLook}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
              >
                <Plus size={15} />
                Add look
              </button>
              {tripOutfitLooks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-xs text-ink-soft">
                  Group a few uploaded visuals into a named look, e.g. "Franklin's BBQ" or "Summit day."
                </p>
              ) : (
                <div className="space-y-2.5">
                  {tripOutfitLooks.map((look) => (
                    <OutfitLookCard key={look.id} look={look} trip={trip} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Belt-and-suspenders on top of the activeTab derivation above: even
          if something else ever slips 'visuals' back into an active tab
          while shareMode is true, this condition alone still keeps every
          uploaded board — image, title, notes — out of the DOM. */}
      {!shareMode && activeTab === 'visuals' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
          >
            <Plus size={15} />
            Add visual
          </button>

          {tripVisualBoards.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <ImageIcon size={22} className="text-ink-soft" />
              <p className="text-sm font-medium text-ink">Add a visual board</p>
              <p className="max-w-[240px] text-xs text-ink-soft">
                Outfit photos, capsule flat-lays, mood boards — upload anything worth keeping alongside this trip.
              </p>
            </div>
          ) : (
            <>
              {outfitBoards.length > 0 && (
                <div>
                  <SectionHeader eyebrow={`${outfitBoards.length} board${outfitBoards.length === 1 ? '' : 's'}`} title="Outfit boards" accent="red" />
                  <div className="grid grid-cols-2 gap-3">
                    {outfitBoards.map((board) => (
                      <VisualBoardCard key={board.id} board={board} trip={trip} />
                    ))}
                  </div>
                </div>
              )}
              {capsulePackingBoards.length > 0 && (
                <div>
                  <SectionHeader
                    eyebrow={`${capsulePackingBoards.length} board${capsulePackingBoards.length === 1 ? '' : 's'}`}
                    title="Capsule & packing boards"
                    accent="red"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {capsulePackingBoards.map((board) => (
                      <VisualBoardCard key={board.id} board={board} trip={trip} />
                    ))}
                  </div>
                </div>
              )}
              {shoesBoards.length > 0 && (
                <div>
                  <SectionHeader eyebrow={`${shoesBoards.length} board${shoesBoards.length === 1 ? '' : 's'}`} title="Shoes" accent="red" />
                  <div className="grid grid-cols-2 gap-3">
                    {shoesBoards.map((board) => (
                      <VisualBoardCard key={board.id} board={board} trip={trip} />
                    ))}
                  </div>
                </div>
              )}
              {accessoriesBoards.length > 0 && (
                <div>
                  <SectionHeader
                    eyebrow={`${accessoriesBoards.length} board${accessoriesBoards.length === 1 ? '' : 's'}`}
                    title="Accessories"
                    accent="red"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {accessoriesBoards.map((board) => (
                      <VisualBoardCard key={board.id} board={board} trip={trip} />
                    ))}
                  </div>
                </div>
              )}
              {otherBoards.length > 0 && (
                <div>
                  <SectionHeader eyebrow={`${otherBoards.length} board${otherBoards.length === 1 ? '' : 's'}`} title="Inspiration boards" accent="red" />
                  <div className="grid grid-cols-2 gap-3">
                    {otherBoards.map((board) => (
                      <VisualBoardCard key={board.id} board={board} trip={trip} aspect="wide" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {!shareMode && <AddVisualBoardSheet trip={trip} />}
      {!shareMode && <AddOutfitLookSheet trip={trip} />}
    </div>
  )
}
