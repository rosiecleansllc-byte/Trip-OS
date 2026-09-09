import { create } from 'zustand'
import type { CapsuleItem } from '../types/trip'

// Ephemeral UI state for the "Edit wardrobe item" sheet — not persisted,
// same shape as useOutfitUiStore/useVisualBoardUiStore. Only tracks
// whether the sheet is open and which seeded CapsuleItem is being
// edited; the form itself is local state owned by EditCapsuleItemSheet.
type CapsuleItemSheetStep = 'closed' | 'open'

interface CapsuleItemUiState {
  step: CapsuleItemSheetStep
  editingItem?: CapsuleItem
  openEdit: (item: CapsuleItem) => void
  close: () => void
}

export const useCapsuleItemUiStore = create<CapsuleItemUiState>()((set) => ({
  step: 'closed',
  editingItem: undefined,
  openEdit: (item) => set({ step: 'open', editingItem: item }),
  close: () => set({ step: 'closed', editingItem: undefined }),
}))
