import { create } from 'zustand'

// Ephemeral "which Pack tab should open next" request — not persisted.
// Lets Today's checklist reminder (or any future cross-page link) land
// directly on Pack's Checklist tab instead of whatever tab Pack would
// otherwise default to, without routing state or a URL param. Pack.tsx
// consumes and clears this once on mount.
type PackTabRequest = 'checklist' | null

interface PackUiState {
  requestedTab: PackTabRequest
  requestChecklistTab: () => void
  consumeRequestedTab: () => void
}

export const usePackUiStore = create<PackUiState>()((set) => ({
  requestedTab: null,
  requestChecklistTab: () => set({ requestedTab: 'checklist' }),
  consumeRequestedTab: () => set({ requestedTab: null }),
}))
