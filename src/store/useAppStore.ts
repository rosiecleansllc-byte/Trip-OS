import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultTripId } from '../data/tripsIndex'

interface AppState {
  currentTripId: string
  shareMode: boolean
  setCurrentTripId: (id: string) => void
  toggleShareMode: () => void
  setShareMode: (value: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTripId: defaultTripId,
      shareMode: false,
      setCurrentTripId: (id) => set({ currentTripId: id }),
      toggleShareMode: () => set((s) => ({ shareMode: !s.shareMode })),
      setShareMode: (value) => set({ shareMode: value }),
    }),
    { name: 'trip-os-app-state' }
  )
)
