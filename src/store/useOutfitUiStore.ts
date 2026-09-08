import { create } from 'zustand'
import type { Outfit } from '../types/trip'

// Ephemeral UI state for the "Create/edit outfit" sheet — mirrors the
// old useOutfitLookUiStore's shape. Only ever opened for a
// traveler-created Outfit (seeded ones aren't editable here).
type OutfitSheetStep = 'closed' | 'form'

interface OutfitUiState {
  step: OutfitSheetStep
  editingOutfit?: Outfit
  openNew: () => void
  openEdit: (outfit: Outfit) => void
  close: () => void
}

export const useOutfitUiStore = create<OutfitUiState>()((set) => ({
  step: 'closed',
  editingOutfit: undefined,
  openNew: () => set({ step: 'form', editingOutfit: undefined }),
  openEdit: (outfit) => set({ step: 'form', editingOutfit: outfit }),
  close: () => set({ step: 'closed', editingOutfit: undefined }),
}))
