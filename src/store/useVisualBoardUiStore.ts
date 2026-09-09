import { create } from 'zustand'
import type { VisualBoard } from '../types/trip'

// Ephemeral UI state for the "Add visual" sheet — not persisted, mirrors
// useManualItemUiStore's shape but kept as its own store since a visual
// board is a different domain entity (VisualBoard, not ManualTripItem).
//
// Only tracks whether the sheet is open, which board (if any) is being
// edited, and — for a fresh (non-editing) open — which top-level kind it
// should land on. The rest of the multi-step flow (which board type or
// wardrobe category, the form itself, and "Change type" recategorization
// while editing) is local state owned by AddVisualBoardSheet, not this
// store. Keeping that here previously caused a real bug: any step
// transition re-triggered the effect that populated the form from
// `editingBoard`, silently discarding whatever the traveler had already
// typed the moment they navigated between steps. Local component state
// has no such re-sync hazard.
type BoardSheetStep = 'closed' | 'open'

// What a fresh (non-editing) open should land on: the generic "What are
// you adding?" chooser, or straight into the wardrobe-category picker.
// Ignored once editingBoard is set — editing always resumes on the
// board/item's own current kind, never this.
type InitialKind = 'board' | 'wardrobe-item'

interface VisualBoardUiState {
  step: BoardSheetStep
  editingBoard?: VisualBoard
  initialKind: InitialKind
  openPicker: () => void
  openWardrobeItem: () => void
  openEdit: (board: VisualBoard) => void
  close: () => void
}

export const useVisualBoardUiStore = create<VisualBoardUiState>()((set) => ({
  step: 'closed',
  editingBoard: undefined,
  initialKind: 'board',
  // Pack → Boards' "Add visual" — the generic chooser (Outfit/Capsule/
  // Mood board/Individual wardrobe item, plus "Other board type").
  openPicker: () => set({ step: 'open', editingBoard: undefined, initialKind: 'board' }),
  // Pack → Wardrobe's "Add wardrobe item" — skips the chooser entirely
  // and lands straight on the wardrobe-category picker, since the kind
  // is already implied by which tab this was tapped from.
  openWardrobeItem: () => set({ step: 'open', editingBoard: undefined, initialKind: 'wardrobe-item' }),
  openEdit: (board) => set({ step: 'open', editingBoard: board }),
  close: () => set({ step: 'closed', editingBoard: undefined }),
}))
