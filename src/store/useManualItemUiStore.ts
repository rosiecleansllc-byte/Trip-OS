import { create } from 'zustand'
import type { ManualItemType, ManualTripItem } from '../types/trip'

// Ephemeral UI state for the "Add to trip" sheet — deliberately not
// persisted (nothing here should survive a refresh). Lives in its own
// store so any page can trigger it (the floating + button, or a manual
// item's ••• menu asking to edit) without threading callbacks through
// AppShell.
type SheetStep = 'closed' | 'picker' | 'form'

interface ManualItemUiState {
  step: SheetStep
  type?: ManualItemType
  editingItem?: ManualTripItem
  openPicker: () => void
  pickType: (type: ManualItemType) => void
  openEdit: (item: ManualTripItem) => void
  close: () => void
}

export const useManualItemUiStore = create<ManualItemUiState>()((set) => ({
  step: 'closed',
  type: undefined,
  editingItem: undefined,
  openPicker: () => set({ step: 'picker', type: undefined, editingItem: undefined }),
  pickType: (type) => set({ step: 'form', type, editingItem: undefined }),
  openEdit: (item) => set({ step: 'form', type: item.type, editingItem: item }),
  close: () => set({ step: 'closed', type: undefined, editingItem: undefined }),
}))
