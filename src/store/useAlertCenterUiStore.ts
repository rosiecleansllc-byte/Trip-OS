import { create } from 'zustand'

// Ephemeral UI state for the Alert Center sheet — not persisted, mirrors
// useManualItemUiStore's shape but with just an open/closed toggle since
// there's no multi-step flow here.
interface AlertCenterUiState {
  open: boolean
  openPanel: () => void
  close: () => void
}

export const useAlertCenterUiStore = create<AlertCenterUiState>()((set) => ({
  open: false,
  openPanel: () => set({ open: true }),
  close: () => set({ open: false }),
}))
