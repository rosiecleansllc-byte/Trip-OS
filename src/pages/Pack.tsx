import { useState } from 'react'
import { clsx } from 'clsx'
import { Check, ImageIcon, Maximize2, Pencil, Plus } from 'lucide-react'
import type { Trip, VisualBoardType } from '../types/trip'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ImagePlaceholder } from '../components/ui/ImagePlaceholder'
import { Lightbox } from '../components/ui/Lightbox'
import { WeatherCard } from '../components/ui/WeatherCard'
import { AddVisualBoardSheet } from '../components/visuals/AddVisualBoardSheet'
import { VisualBoardCard } from '../components/visuals/VisualBoardCard'
import { OutfitBoardSection } from '../components/visuals/OutfitBoardSection'
import { CapsuleItemImage } from '../components/pack/CapsuleItemImage'
import { OutfitCard } from '../components/wardrobe/OutfitCard'
import { WardrobeOutfitBoardSection } from '../components/wardrobe/WardrobeOutfitBoardSection'
import { getWeatherLocationForDay, isWithinForecastRange, useWeather } from '../lib/weather'
import { isWardrobeItemBoard, sortVisualBoards, uploadedWardrobeItemsForTrip } from '../lib/visualBoards'
import {
  WARDROBE_CATEGORY_LABELS,
  WARDROBE_CATEGORY_ORDER,
  allSeededOutfitsInOrder,
  getEffectiveCapsule,
  sortOutfits,
} from '../lib/wardrobeOutfits'
import { useAppStore } from '../store/useAppStore'
import { useVisualBoardUiStore } from '../store/useVisualBoardUiStore'
import { useOutfitUiStore } from '../store/useOutfitUiStore'
import { useOutfitDetailUiStore } from '../store/useOutfitDetailUiStore'
import { useCapsuleItemUiStore } from '../store/useCapsuleItemUiStore'

const OUTFIT_TIER: VisualBoardType[] = ['outfit']
const CAPSULE_TIER: VisualBoardType[] = ['capsule', 'packing']
const SHOES_TIER: VisualBoardType[] = ['shoes']
const ACCESSORIES_TIER: VisualBoardType[] = ['accessories']
const OTHER_TIER: VisualBoardType[] = ['mood', 'city', 'other']

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
  const hasChecklist = (trip.packingList?.length ?? 0) > 0
  const shareMode = useAppStore((s) => s.shareMode)
  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeItemOverrides = useAppStore((s) => s.wardrobeItemOverrides)
  const openEditCapsuleItem = useCapsuleItemUiStore((s) => s.openEdit)
  // Seeded CapsuleItems with any traveler edit already applied (see
  // lib/wardrobeOutfits.ts CapsuleItemOverride) — every rendering
  // surface in this tab reads the effective item, never trip.capsule
  // directly, so a rename/recategorize/photo change shows immediately.
  const effectiveCapsule = getEffectiveCapsule(trip, wardrobeItemOverrides)
  // Traveler-uploaded individual wardrobe pieces (see types/trip.ts
  // VisualBoard.visualKind) — rendered in the Wardrobe tab grouped by
  // category alongside any seeded CapsuleItems, never in Boards. Hidden
  // entirely in Share mode, same as every other private-upload surface.
  const uploadedWardrobeItems = shareMode ? [] : uploadedWardrobeItemsForTrip(visualBoards, trip.meta.id)
  const hasWardrobeTab = effectiveCapsule.length > 0 || uploadedWardrobeItems.length > 0
  // "Visuals"/Boards is always present outside Share mode — Austin has no
  // seeded capsule/outfit data at all, and every trip (seeded or not)
  // should still be able to hold traveler-uploaded boards. Hidden
  // entirely in Share mode, same as the per-board Add/Edit/Replace/Delete
  // controls it hosts.
  const tabs: PackTab[] = [
    ...(hasWardrobeTab ? (['capsule', 'outfits'] as const) : []),
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
  const openPicker = useVisualBoardUiStore((s) => s.openPicker)
  const openWardrobeItem = useVisualBoardUiStore((s) => s.openWardrobeItem)
  const outfits = useAppStore((s) => s.outfits)
  const openNewOutfit = useOutfitUiStore((s) => s.openNew)
  const openOutfitDetail = useOutfitDetailUiStore((s) => s.open)
  // Boards only — wardrobe-item-kind uploads live in the Wardrobe tab
  // instead (uploadedWardrobeItems above).
  const tripVisualBoards = sortVisualBoards(
    visualBoards.filter((b) => b.tripId === trip.meta.id && !isWardrobeItemBoard(b))
  )
  const outfitBoards = tripVisualBoards.filter((b) => OUTFIT_TIER.includes(b.type))
  const capsulePackingBoards = tripVisualBoards.filter((b) => CAPSULE_TIER.includes(b.type))
  const shoesBoards = tripVisualBoards.filter((b) => SHOES_TIER.includes(b.type))
  const accessoriesBoards = tripVisualBoards.filter((b) => ACCESSORIES_TIER.includes(b.type))
  const otherBoards = tripVisualBoards.filter((b) => OTHER_TIER.includes(b.type))
  const tripCustomOutfits = sortOutfits(outfits.filter((o) => o.tripId === trip.meta.id))
  const hasSeededOutfits = allSeededOutfitsInOrder(trip).length > 0

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
                ? 'Wardrobe'
                : key === 'outfits'
                  ? 'Outfits'
                  : key === 'visuals'
                    ? 'Boards'
                    : 'Checklist'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'checklist' && <PackingChecklist trip={trip} />}

      {activeTab === 'capsule' && (
        <div className="space-y-6">
          {!shareMode && (
            <button
              type="button"
              onClick={openWardrobeItem}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
            >
              <Plus size={15} />
              Add wardrobe item
            </button>
          )}
          {WARDROBE_CATEGORY_ORDER.map((cat) => {
            const seededItems = effectiveCapsule.filter((c) => c.category === cat)
            const uploadedItems = uploadedWardrobeItems.filter((b) => (b.wardrobeCategory ?? 'other') === cat)
            if (seededItems.length === 0 && uploadedItems.length === 0) return null
            return (
              <div key={cat}>
                <SectionHeader
                  eyebrow={`${seededItems.length + uploadedItems.length} items`}
                  title={WARDROBE_CATEGORY_LABELS[cat]}
                  accent="red"
                />
                <div className="grid grid-cols-2 gap-3">
                  {seededItems.map((item) => (
                    <Card key={item.id} className="relative overflow-hidden">
                      {shareMode ? (
                        <ImagePlaceholder label={item.name} imageUrl={item.imageUrl} className="h-32 w-full" />
                      ) : (
                        <CapsuleItemImage item={item} trip={trip} className="h-32 w-full" />
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-ink">{item.name}</p>
                        {item.note && <p className="mt-0.5 text-[11px] text-ink-soft">{item.note}</p>}
                      </div>
                      {!shareMode && (
                        <button
                          type="button"
                          aria-label="Edit wardrobe item"
                          onClick={() => {
                            // The sheet needs the raw seeded item (not
                            // the override-applied one) so it can tell
                            // whether a seeded photo exists to restore —
                            // see EditCapsuleItemSheet's seededPhotoRemoved.
                            const seeded = trip.capsule.find((c) => c.id === item.id)
                            if (seeded) openEditCapsuleItem(seeded)
                          }}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/55 text-white"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </Card>
                  ))}
                  {/* Traveler-uploaded pieces for this category — full
                      View/Replace/Remove/Edit/Delete lifecycle already
                      lives in VisualBoardCard, including recategorizing
                      one that was mis-saved. */}
                  {uploadedItems.map((board) => (
                    <VisualBoardCard key={board.id} board={board} trip={trip} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'outfits' && (
        <div className="space-y-6">
          {/* The trip's own curated outfit board — whichever system this
              trip is seeded on. WardrobeOutfitBoardSection (real
              wardrobe-item references, e.g. Austin) and OutfitBoardSection
              (the older itemNames text scaffold matched against loose
              uploads, e.g. France) each render nothing when their trip
              has no matching seed data, so exactly one ever actually
              shows content for a given trip today. */}
          {hasSeededOutfits && (
            <div>
              <SectionHeader eyebrow="Outfit board" title={`${trip.meta.name} Outfit Board`} accent="red" />
              <WardrobeOutfitBoardSection trip={trip} shareMode={shareMode} />
            </div>
          )}
          <OutfitBoardSection trip={trip} />

          {/* Freely-editable custom outfits (see types/trip.ts Outfit) —
              never seeded, built by picking from this trip's own wardrobe
              items. Hidden entirely in Share mode along with the control
              to add one, same as every other private/edit surface in
              Pack. */}
          {!shareMode && (
            <div>
              <SectionHeader
                eyebrow={`${tripCustomOutfits.length} outfit${tripCustomOutfits.length === 1 ? '' : 's'}`}
                title="Your outfits"
                accent="red"
              />
              <button
                type="button"
                onClick={openNewOutfit}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-blue/30 bg-blue-tint py-2.5 text-sm font-medium text-blue"
              >
                <Plus size={15} />
                Create outfit
              </button>
              {tripCustomOutfits.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-xs text-ink-soft">
                  Build an outfit from this trip's wardrobe items, e.g. "Franklin's BBQ" or "Summit day."
                </p>
              ) : (
                <div className="space-y-2.5">
                  {tripCustomOutfits.map((outfit) => (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      trip={trip}
                      editable
                      onOpen={() => openOutfitDetail(outfit.id)}
                    />
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
    </div>
  )
}
