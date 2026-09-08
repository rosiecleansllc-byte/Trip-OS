import { create } from 'zustand'

// Global "which outfit's detail is open" state — mounted once in
// AppShell (see components/wardrobe/OutfitDetailSheet.tsx) rather than
// per-page, specifically so Trip.tsx can call open(outfitId) and land
// on that exact outfit's detail view without navigating to Pack first.
// Just an id: the detail sheet looks the Outfit up itself (seeded or
// traveler-created) from whichever trip is current.
interface OutfitDetailUiState {
  openOutfitId: string | null
  open: (id: string) => void
  close: () => void
}

export const useOutfitDetailUiStore = create<OutfitDetailUiState>()((set) => ({
  openOutfitId: null,
  open: (id) => set({ openOutfitId: id }),
  close: () => set({ openOutfitId: null }),
}))
