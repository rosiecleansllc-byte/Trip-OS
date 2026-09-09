import { useEffect, useState } from 'react'
import { Building2, Footprints, Gem, Layers, Luggage, ImageIcon, Shirt, Sparkles } from 'lucide-react'
import type { CapsuleCategory, Trip, VisualBoard, VisualBoardType } from '../types/trip'

// Device-local storage for traveler-uploaded visual boards (outfit
// photos, capsule/packing flat-lays, mood boards, city inspiration).
// Mirrors lib/privateDocs.ts exactly — same reasoning applies: Trip OS
// has no backend, so a "private" image can only ever live in this
// browser's IndexedDB, never on a server, never in git, never bundled
// into the JS. Kept as its own database (not a second store bolted onto
// trip-os-private-docs) since boards are a distinct, generic entity, not
// tied to a LinkActions privateDocumentKey slot.

export interface StoredBoardImage {
  blob: Blob
  type: string // MIME type, e.g. "image/jpeg"
  name: string
  savedAt: number
}

const DB_NAME = 'trip-os-visual-boards'
const STORE_NAME = 'boards'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

export async function putVisualBoardImage(key: string, file: File): Promise<void> {
  const db = await openDb()
  const doc: StoredBoardImage = { blob: file, type: file.type, name: file.name, savedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(doc, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getVisualBoardImage(key: string): Promise<StoredBoardImage | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as StoredBoardImage | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteVisualBoardImage(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const BOARD_PREFIX = 'visual-'

export function createVisualBoard(
  input: Omit<VisualBoard, 'id' | 'imageKey' | 'createdAt'>
): VisualBoard {
  const id = `${BOARD_PREFIX}${crypto.randomUUID()}`
  return {
    ...input,
    id,
    imageKey: `${id}-img`,
    createdAt: new Date().toISOString(),
  }
}

export const VISUAL_BOARD_TYPE_META: Record<VisualBoardType, { label: string; pickerLabel: string }> = {
  outfit: { label: 'Outfit', pickerLabel: 'Outfit' },
  capsule: { label: 'Capsule wardrobe', pickerLabel: 'Capsule wardrobe' },
  packing: { label: 'Packing', pickerLabel: 'Packing' },
  shoes: { label: 'Shoes', pickerLabel: 'Shoes' },
  accessories: { label: 'Accessories', pickerLabel: 'Accessories' },
  mood: { label: 'Mood / Inspiration', pickerLabel: 'Mood / Inspiration' },
  city: { label: 'City', pickerLabel: 'City' },
  other: { label: 'Other', pickerLabel: 'Other' },
}

// Shared icon per type — used by the type picker, VisualBoardCard, and
// anywhere else a board's type needs a glyph, so every surface stays in
// sync with a single mapping instead of each screen keeping its own.
export const VISUAL_BOARD_TYPE_ICON: Record<VisualBoardType, typeof Shirt> = {
  outfit: Shirt,
  capsule: Layers,
  packing: Luggage,
  shoes: Footprints,
  accessories: Gem,
  mood: Sparkles,
  city: Building2,
  other: ImageIcon,
}

// Pack sorts boards into five tiers: day-specific outfit boards in
// trip-date order, then capsule/packing, then shoes, then accessories,
// then everything else (mood/city/other) — see sortVisualBoards.
function boardSortTier(board: VisualBoard): number {
  if (board.type === 'outfit') return 0
  if (board.type === 'capsule' || board.type === 'packing') return 1
  if (board.type === 'shoes') return 2
  if (board.type === 'accessories') return 3
  return 4
}

export function sortVisualBoards(boards: VisualBoard[]): VisualBoard[] {
  return [...boards].sort((a, b) => {
    const tierDiff = boardSortTier(a) - boardSortTier(b)
    if (tierDiff !== 0) return tierDiff
    // Within a tier, day-specific boards sort by date first (undated
    // boards of the same tier sort after dated ones, then by title).
    const dateA = a.date ?? '9999-99-99'
    const dateB = b.date ?? '9999-99-99'
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return a.title.localeCompare(b.title)
  })
}

// All of a day's boards of a given type, not just one — a day can have
// more than one uploaded outfit (e.g. a travel-day look plus a same-day
// change of outfit for dinner). Sorted primaryForDay-first, then by
// creation order, so "the" outfit (singular call sites, and index 0 for
// plural ones) is always deterministic rather than array-order-dependent.
export function findDayVisualBoards(
  boards: VisualBoard[],
  tripId: string,
  dayId: string,
  type: VisualBoardType = 'outfit'
): VisualBoard[] {
  return boards
    .filter((b) => b.tripId === tripId && b.dayId === dayId && b.type === type)
    .sort((a, b) => {
      if (Boolean(a.primaryForDay) !== Boolean(b.primaryForDay)) return a.primaryForDay ? -1 : 1
      return a.createdAt.localeCompare(b.createdAt)
    })
}

export function findDayVisualBoard(
  boards: VisualBoard[],
  tripId: string,
  dayId: string,
  type: VisualBoardType = 'outfit'
): VisualBoard | undefined {
  return findDayVisualBoards(boards, tripId, dayId, type)[0]
}

export function dayLabelFor(trip: Trip, dayId: string | undefined): string | undefined {
  if (!dayId) return undefined
  const day = trip.days.find((d) => d.id === dayId)
  return day ? `Day ${day.dayNumber} · ${day.title}` : undefined
}

// A VisualBoard uploaded as a single wardrobe piece rather than a true
// multi-item board — see types/trip.ts VisualBoard.visualKind. Every
// pre-existing upload (visualKind absent) is a board, same as before
// this field existed.
export function isWardrobeItemBoard(board: VisualBoard): boolean {
  return board.visualKind === 'wardrobe-item'
}

// Every traveler-uploaded wardrobe piece for a trip — the Wardrobe tab's
// counterpart to sortVisualBoards' board-only listing (see Pack.tsx,
// which filters isWardrobeItemBoard out of its Boards tab and into this
// instead).
export function uploadedWardrobeItemsForTrip(boards: VisualBoard[], tripId: string): VisualBoard[] {
  return boards.filter((b) => b.tripId === tripId && isWardrobeItemBoard(b))
}

// Optional preset subtype chips shown per category in the wardrobe-item
// add form — display-only labels, never validated or matched against.
// Categories with no obvious short list (dress/outerwear/bag/other) get
// none; the traveler can still type a freeform subtype for those.
export const WARDROBE_SUBTYPE_PRESETS: Partial<Record<CapsuleCategory, string[]>> = {
  top: ['Tee', 'Blouse', 'Button-down', 'Sweater'],
  bottom: ['Jeans', 'Skirt', 'Leggings', 'Trousers'],
  shoes: ['Sneakers', 'Sandals', 'Heels', 'Flats'],
  accessory: ['Scarf', 'Sunglasses', 'Jewelry', 'Belt'],
}

// Loads a board's image from IndexedDB and exposes it as an object URL,
// used anywhere a VisualBoard's picture needs to render (Pack's grid,
// Today's outfit card, Trip's day thumbnail) — one hook instead of
// duplicating the fetch/object-URL/cleanup dance at each call site.
//
// Every state update happens inside the fetch promise's own then/catch,
// never synchronously in the effect body, so `status` is derived from
// whether the last-settled result matches the current imageKey rather
// than stored directly — same pattern as lib/weather.ts's useWeather.
export type VisualBoardImageStatus = 'loading' | 'ready' | 'missing'

// `version` is a caller-bumped cache-buster (e.g. incremented after a
// Replace-image action) — the image's IndexedDB key never changes when its
// blob is replaced, so without this the effect below would have no reason
// to re-run and would keep showing the old object URL.
export function useVisualBoardImage(
  imageKey: string | undefined,
  version: number | string = 0
): {
  url: string | undefined
  status: VisualBoardImageStatus
} {
  const [result, setResult] = useState<{ key: string; url: string | undefined } | undefined>(undefined)
  const resultKey = `${imageKey ?? ''}::${version}`

  useEffect(() => {
    if (!imageKey) return
    let cancelled = false
    let objectUrl: string | undefined
    getVisualBoardImage(imageKey)
      .then((doc) => {
        if (cancelled) return
        if (doc) {
          objectUrl = URL.createObjectURL(doc.blob)
          setResult({ key: resultKey, url: objectUrl })
        } else {
          setResult({ key: resultKey, url: undefined })
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ key: resultKey, url: undefined })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey, version])

  const current = result && result.key === resultKey ? result : undefined
  const status: VisualBoardImageStatus = !imageKey ? 'missing' : !current ? 'loading' : current.url ? 'ready' : 'missing'
  return { url: current?.url, status }
}
