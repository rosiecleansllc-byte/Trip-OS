import { useAppStore } from '../store/useAppStore'
import { usePrivateDocKeySet } from './walletDocs'
import { getEffectiveChecklist } from './checklist'
import { getEffectiveTrip } from './manualItems'
import { computeReadiness } from './readiness'
import type { Trip } from '../types/trip'
export function useReadinessCalculator() {
  const state = useAppStore()
  const { keys } = usePrivateDocKeySet()
  return (trip: Trip) => {
    const effective = getEffectiveTrip(trip, state.manualItems, state.resolvedOpenItemIds)
    const checklist = getEffectiveChecklist(effective, state.checklistItemOverrides, state.customChecklistItems, state.packedItems, keys)
    return computeReadiness(effective, checklist)
  }
}
