import { create } from 'zustand'
import type { OutfitLook } from '../types/trip'

// Ephemeral UI state for the "Add/edit look" sheet — mirrors
// useVisualBoardUiStore's shape, one step simpler still (an OutfitLook
// has no type picker, just one form).
type LookSheetStep = 'closed' | 'form'

interface OutfitLookUiState {
  step: LookSheetStep
  editingLook?: OutfitLook
  openNew: () => void
  openEdit: (look: OutfitLook) => void
  close: () => void
}

export const useOutfitLookUiStore = create<OutfitLookUiState>()((set) => ({
  step: 'closed',
  editingLook: undefined,
  openNew: () => set({ step: 'form', editingLook: undefined }),
  openEdit: (look) => set({ step: 'form', editingLook: look }),
  close: () => set({ step: 'closed', editingLook: undefined }),
}))
