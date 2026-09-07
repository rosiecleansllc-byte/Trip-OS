import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultTripId } from '../data/tripsIndex'

interface AppState {
  currentTripId: string
  shareMode: boolean
  // Packing checklist state, keyed by `${tripId}:${packingItemId}`. Plain
  // localStorage-backed state (via persist) is fine here — unlike private
  // documents, "packed the toiletries" isn't sensitive, so it doesn't need
  // the IndexedDB private-doc treatment in lib/privateDocs.ts.
  packedItems: Record<string, boolean>
  setCurrentTripId: (id: string) => void
  toggleShareMode: () => void
  setShareMode: (value: boolean) => void
  togglePacked: (tripId: string, itemId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTripId: defaultTripId,
      shareMode: false,
      packedItems: {},
      setCurrentTripId: (id) => set({ currentTripId: id }),
      toggleShareMode: () => set((s) => ({ shareMode: !s.shareMode })),
      setShareMode: (value) => set({ shareMode: value }),
      togglePacked: (tripId, itemId) =>
        set((s) => {
          const key = `${tripId}:${itemId}`
          return { packedItems: { ...s.packedItems, [key]: !s.packedItems[key] } }
        }),
    }),
    { name: 'trip-os-app-state' }
  )
)
