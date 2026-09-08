import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultTripId } from '../data/tripsIndex'
import type { ManualTripItem } from '../types/trip'

interface AppState {
  currentTripId: string
  shareMode: boolean
  // Packing checklist state, keyed by `${tripId}:${packingItemId}`. Plain
  // localStorage-backed state (via persist) is fine here — unlike private
  // documents, "packed the toiletries" isn't sensitive, so it doesn't need
  // the IndexedDB private-doc treatment in lib/privateDocs.ts.
  packedItems: Record<string, boolean>
  // Trip items Cecilia adds herself from inside the app (see types/trip.ts
  // ManualTripItem). Plain localStorage is fine here too — any private
  // document attached to one still goes through the IndexedDB wallet, not
  // this store; see lib/manualItems.ts.
  manualItems: ManualTripItem[]
  // Explicit traveler overrides of a seeded OpenItem's status, keyed by
  // `${tripId}:${openItemId}` — true means "resolved", false means
  // "reopened". A key's absence means "use whatever the seed data says".
  // Kept separate from the trip's own (static, imported) OpenItem array
  // rather than mutating it.
  resolvedOpenItemIds: Record<string, boolean>
  setCurrentTripId: (id: string) => void
  toggleShareMode: () => void
  setShareMode: (value: boolean) => void
  togglePacked: (tripId: string, itemId: string) => void
  addManualItem: (item: ManualTripItem) => void
  updateManualItem: (id: string, patch: Partial<ManualTripItem>) => void
  deleteManualItem: (id: string) => void
  resolveOpenItem: (tripId: string, openItemId: string) => void
  unresolveOpenItem: (tripId: string, openItemId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTripId: defaultTripId,
      shareMode: false,
      packedItems: {},
      manualItems: [],
      resolvedOpenItemIds: {},
      setCurrentTripId: (id) => set({ currentTripId: id }),
      toggleShareMode: () => set((s) => ({ shareMode: !s.shareMode })),
      setShareMode: (value) => set({ shareMode: value }),
      togglePacked: (tripId, itemId) =>
        set((s) => {
          const key = `${tripId}:${itemId}`
          return { packedItems: { ...s.packedItems, [key]: !s.packedItems[key] } }
        }),
      addManualItem: (item) => set((s) => ({ manualItems: [...s.manualItems, item] })),
      updateManualItem: (id, patch) =>
        set((s) => ({
          manualItems: s.manualItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteManualItem: (id) =>
        set((s) => ({ manualItems: s.manualItems.filter((i) => i.id !== id) })),
      resolveOpenItem: (tripId, openItemId) =>
        set((s) => ({
          resolvedOpenItemIds: { ...s.resolvedOpenItemIds, [`${tripId}:${openItemId}`]: true },
        })),
      // Explicitly records "the traveler reopened this" rather than just
      // deleting the override — an OpenItem can start already resolved in
      // its own seed data (e.g. a decision made before the app modeled it
      // as a live checklist item), so reverting to "whatever the seed
      // said" isn't always the same as "open". getEffectiveTrip reads this
      // same key both ways: true forces done, false forces open.
      unresolveOpenItem: (tripId, openItemId) =>
        set((s) => ({
          resolvedOpenItemIds: { ...s.resolvedOpenItemIds, [`${tripId}:${openItemId}`]: false },
        })),
    }),
    { name: 'trip-os-app-state' }
  )
)
