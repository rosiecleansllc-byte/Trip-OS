import { create } from 'zustand'
import type { VisualBoard, VisualBoardType } from '../types/trip'

// Ephemeral UI state for the "Add visual" sheet — not persisted, mirrors
// useManualItemUiStore's shape but kept as its own store since a visual
// board is a different domain entity (VisualBoardType/VisualBoard, not
// ManualItemType/ManualTripItem) with a simpler step machine — no
// OCR-adjacent "method"/"reading" steps are needed here.
type BoardSheetStep = 'closed' | 'picker' | 'form'

interface VisualBoardUiState {
  step: BoardSheetStep
  type?: VisualBoardType
  editingBoard?: VisualBoard
  openPicker: () => void
  pickType: (type: VisualBoardType) => void
  openEdit: (board: VisualBoard) => void
  close: () => void
}

export const useVisualBoardUiStore = create<VisualBoardUiState>()((set) => ({
  step: 'closed',
  type: undefined,
  editingBoard: undefined,
  openPicker: () => set({ step: 'picker', type: undefined, editingBoard: undefined }),
  pickType: (type) => set({ step: 'form', type }),
  openEdit: (board) => set({ step: 'form', type: board.type, editingBoard: board }),
  close: () => set({ step: 'closed', type: undefined, editingBoard: undefined }),
}))
