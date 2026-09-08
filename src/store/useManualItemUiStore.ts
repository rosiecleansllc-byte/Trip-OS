import { create } from 'zustand'
import type { ManualItemType, ManualTripItem } from '../types/trip'

// Ephemeral UI state for the "Add to trip" sheet — deliberately not
// persisted (nothing here should survive a refresh). Lives in its own
// store so any page can trigger it (the floating + button, or a manual
// item's ••• menu asking to edit) without threading callbacks through
// AppShell.
//
// 'method' is the "Upload confirmation" vs "Enter manually" chooser
// shown after picking a type (skipped for 'other', which is manual-only).
// 'reading' is the brief "Reading confirmation…" OCR-in-progress screen
// between picking a screenshot and landing on the (possibly prefilled)
// form. AddItemSheet owns the actual OCR call and file handling; this
// store only tracks which screen is showing.
type SheetStep = 'closed' | 'picker' | 'method' | 'reading' | 'form'

interface ManualItemUiState {
  step: SheetStep
  type?: ManualItemType
  editingItem?: ManualTripItem
  openPicker: () => void
  pickType: (type: ManualItemType) => void
  startReading: () => void
  enterForm: () => void
  openEdit: (item: ManualTripItem) => void
  close: () => void
}

export const useManualItemUiStore = create<ManualItemUiState>()((set) => ({
  step: 'closed',
  type: undefined,
  editingItem: undefined,
  openPicker: () => set({ step: 'picker', type: undefined, editingItem: undefined }),
  pickType: (type) => set({ step: type === 'other' ? 'form' : 'method', type, editingItem: undefined }),
  startReading: () => set({ step: 'reading' }),
  enterForm: () => set({ step: 'form' }),
  openEdit: (item) => set({ step: 'form', type: item.type, editingItem: item }),
  close: () => set({ step: 'closed', type: undefined, editingItem: undefined }),
}))
