import { create } from 'zustand'
import type { EffectiveChecklistItem } from '../lib/checklist'

// Ephemeral UI state for the "Add/edit checklist item" sheet — not
// persisted, same shape as useCapsuleItemUiStore/useOutfitUiStore.
// editingItem set means editing an existing (seeded or custom) item;
// unset means adding a new one. defaultCategory prefills the category
// when opened from a specific category's own "+ Add item" row.
type ChecklistItemSheetStep = 'closed' | 'open'

interface ChecklistItemUiState {
  step: ChecklistItemSheetStep
  editingItem?: EffectiveChecklistItem
  defaultCategory?: string
  openAdd: (category?: string) => void
  openEdit: (item: EffectiveChecklistItem) => void
  close: () => void
}

export const useChecklistItemUiStore = create<ChecklistItemUiState>()((set) => ({
  step: 'closed',
  editingItem: undefined,
  defaultCategory: undefined,
  openAdd: (category) => set({ step: 'open', editingItem: undefined, defaultCategory: category }),
  openEdit: (item) => set({ step: 'open', editingItem: item, defaultCategory: undefined }),
  close: () => set({ step: 'closed', editingItem: undefined, defaultCategory: undefined }),
}))
