import { create } from 'zustand'
import type { VisualBoard } from '../types/trip'

// Ephemeral UI state for the "Add visual" sheet — not persisted, mirrors
// useManualItemUiStore's shape but kept as its own store since a visual
// board is a different domain entity (VisualBoard, not ManualTripItem).
//
// Only tracks whether the sheet is open and which board (if any) is
// being edited — the multi-step flow inside it (what kind of upload,
// which board type or wardrobe category, the form itself, and
// "Change type" recategorization while editing) is local state owned by
// AddVisualBoardSheet, not this store. Keeping that here previously
// caused a real bug: any step transition re-triggered the effect that
// populated the form from `editingBoard`, silently discarding whatever
// the traveler had already typed the moment they navigated between
// steps. Local component state has no such re-sync hazard.
type BoardSheetStep = 'closed' | 'open'

interface VisualBoardUiState {
  step: BoardSheetStep
  editingBoard?: VisualBoard
  openPicker: () => void
  openEdit: (board: VisualBoard) => void
  close: () => void
}

export const useVisualBoardUiStore = create<VisualBoardUiState>()((set) => ({
  step: 'closed',
  editingBoard: undefined,
  openPicker: () => set({ step: 'open', editingBoard: undefined }),
  openEdit: (board) => set({ step: 'open', editingBoard: board }),
  close: () => set({ step: 'closed', editingBoard: undefined }),
}))
