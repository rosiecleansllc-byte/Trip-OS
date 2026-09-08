import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultTripId } from '../data/tripsIndex'
import type { ManualTripItem, Outfit, VisualBoard } from '../types/trip'

interface AppState {
  currentTripId: string
  shareMode: boolean
  // Packing checklist state, keyed by `${tripId}:${packingItemId}`. Plain
  // localStorage-backed state (via persist) is fine here — unlike private
  // documents, "packed the toiletries" isn't sensitive, so it doesn't need
  // the IndexedDB private-doc treatment in lib/privateDocs.ts.
  packedItems: Record<string, boolean>
  // Trip items Cecilia adds herself from inside the app (see types/trip.ts
  // ManualTripItem). Plain localStorage is fine here too — any private
  // document attached to one still goes through the IndexedDB wallet, not
  // this store; see lib/manualItems.ts.
  manualItems: ManualTripItem[]
  // Explicit traveler overrides of a seeded OpenItem's status, keyed by
  // `${tripId}:${openItemId}` — true means "resolved", false means
  // "reopened". A key's absence means "use whatever the seed data says".
  // Kept separate from the trip's own (static, imported) OpenItem array
  // rather than mutating it.
  resolvedOpenItemIds: Record<string, boolean>
  // Traveler-uploaded visual boards (see types/trip.ts VisualBoard). Same
  // shape of storage as manualItems — a flat array across all trips,
  // filtered by tripId at read time — and the same split as manual
  // items' private documents: this only ever holds metadata, the image
  // itself lives in IndexedDB (lib/visualBoards.ts), never here.
  visualBoards: VisualBoard[]
  // Traveler-created outfits (see types/trip.ts Outfit) — same storage
  // shape as visualBoards: metadata only, a flat cross-trip array
  // filtered by tripId, never seeded. Each itemIds entry just points at
  // an existing CapsuleItem; no image data lives here.
  outfits: Outfit[]
  // Trip Alerts are generated fresh from trip data every time Trip OS
  // opens/resumes (see lib/alerts.ts) — nothing about an alert itself is
  // ever persisted, only what the traveler did with it, keyed by
  // `${tripId}:${alertId}` where alertId is deterministic (e.g.
  // `leave:${scheduleItemId}`) so the same real-world alert keeps the
  // same override across regenerations. dismissed hides it until the
  // underlying condition changes (which naturally stops generating that
  // alertId); snoozedUntil (an ISO timestamp) hides it only until that
  // time passes, after which it reappears on its own — no separate
  // "un-snooze" action needed.
  alertOverrides: Record<string, { dismissed?: boolean; snoozedUntil?: string }>
  // Whether the traveler has been asked (and how they answered) about
  // browser notifications for this device — the actual permission is
  // always re-read live from Notification.permission, this only
  // remembers that the app shouldn't ask again unprompted.
  notificationsRequested: boolean
  setCurrentTripId: (id: string) => void
  toggleShareMode: () => void
  setShareMode: (value: boolean) => void
  togglePacked: (tripId: string, itemId: string) => void
  addManualItem: (item: ManualTripItem) => void
  updateManualItem: (id: string, patch: Partial<ManualTripItem>) => void
  deleteManualItem: (id: string) => void
  resolveOpenItem: (tripId: string, openItemId: string) => void
  unresolveOpenItem: (tripId: string, openItemId: string) => void
  addVisualBoard: (board: VisualBoard) => void
  updateVisualBoard: (id: string, patch: Partial<VisualBoard>) => void
  deleteVisualBoard: (id: string) => void
  addOutfit: (outfit: Outfit) => void
  updateOutfit: (id: string, patch: Partial<Outfit>) => void
  deleteOutfit: (id: string) => void
  dismissAlert: (tripId: string, alertId: string) => void
  snoozeAlert: (tripId: string, alertId: string, untilISO: string) => void
  setNotificationsRequested: (value: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTripId: defaultTripId,
      shareMode: false,
      packedItems: {},
      manualItems: [],
      resolvedOpenItemIds: {},
      visualBoards: [],
      outfits: [],
      alertOverrides: {},
      notificationsRequested: false,
      setCurrentTripId: (id) => set({ currentTripId: id }),
      toggleShareMode: () => set((s) => ({ shareMode: !s.shareMode })),
      setShareMode: (value) => set({ shareMode: value }),
      togglePacked: (tripId, itemId) =>
        set((s) => {
          const key = `${tripId}:${itemId}`
          return { packedItems: { ...s.packedItems, [key]: !s.packedItems[key] } }
        }),
      addManualItem: (item) => set((s) => ({ manualItems: [...s.manualItems, item] })),
      updateManualItem: (id, patch) =>
        set((s) => ({
          manualItems: s.manualItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteManualItem: (id) =>
        set((s) => ({ manualItems: s.manualItems.filter((i) => i.id !== id) })),
      resolveOpenItem: (tripId, openItemId) =>
        set((s) => ({
          resolvedOpenItemIds: { ...s.resolvedOpenItemIds, [`${tripId}:${openItemId}`]: true },
        })),
      // Explicitly records "the traveler reopened this" rather than just
      // deleting the override — an OpenItem can start already resolved in
      // its own seed data (e.g. a decision made before the app modeled it
      // as a live checklist item), so reverting to "whatever the seed
      // said" isn't always the same as "open". getEffectiveTrip reads this
      // same key both ways: true forces done, false forces open.
      unresolveOpenItem: (tripId, openItemId) =>
        set((s) => ({
          resolvedOpenItemIds: { ...s.resolvedOpenItemIds, [`${tripId}:${openItemId}`]: false },
        })),
      addVisualBoard: (board) => set((s) => ({ visualBoards: [...s.visualBoards, board] })),
      updateVisualBoard: (id, patch) =>
        set((s) => ({
          visualBoards: s.visualBoards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteVisualBoard: (id) =>
        set((s) => ({ visualBoards: s.visualBoards.filter((b) => b.id !== id) })),
      addOutfit: (outfit) => set((s) => ({ outfits: [...s.outfits, outfit] })),
      updateOutfit: (id, patch) =>
        set((s) => ({
          outfits: s.outfits.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      deleteOutfit: (id) => set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) })),
      dismissAlert: (tripId, alertId) =>
        set((s) => ({
          alertOverrides: { ...s.alertOverrides, [`${tripId}:${alertId}`]: { dismissed: true } },
        })),
      snoozeAlert: (tripId, alertId, untilISO) =>
        set((s) => ({
          alertOverrides: { ...s.alertOverrides, [`${tripId}:${alertId}`]: { snoozedUntil: untilISO } },
        })),
      setNotificationsRequested: (value) => set({ notificationsRequested: value }),
    }),
    { name: 'trip-os-app-state' }
  )
)
