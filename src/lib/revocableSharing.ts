import { useEffect, useState } from 'react'
import type { Trip } from '../types/trip'
import { useAppStore } from '../store/useAppStore'
import { publicTripSnapshot } from './tripSharing'

const API = '/.netlify/functions/trip-share'
export const sharedViewId = (id: string) => `received-${id}`
export async function createSharingLink(trip: Trip): Promise<{ id: string; manageToken: string; createdAt: string; expiresAt: string }> {
  const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trip: publicTripSnapshot(trip) }), cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'Unable to create sharing link.')
  return result
}
export async function stopSharingLink(id: string, manageToken: string) {
  const response = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${manageToken}` }, cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to stop sharing. Please try again.')
}
export async function readSharingLink(id: string, signal?: AbortSignal): Promise<Trip> {
  const response = await fetch(`${API}?id=${encodeURIComponent(id)}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(response.status === 410 || response.status === 404 ? 'This trip is no longer shared, or its link has expired.' : 'Unable to verify access. Reconnect to view this shared itinerary.')
  const data = await response.json()
  const trip = publicTripSnapshot(data.trip)
  trip.meta.id = sharedViewId(id)
  trip.meta.sharedLinkId = id
  trip.meta.sharedSnapshotAt = data.createdAt
  return trip
}

// Never persist itinerary contents on the recipient's device. Every open
// verifies access; foreground views recheck within 30 seconds and on resume.
export function useReceivedTrip(currentTripId: string) {
  const shareId = currentTripId.startsWith('received-') ? currentTripId.slice(9) : undefined
  const [state, setState] = useState<{ id: string; trip?: Trip; error?: string }>()
  useEffect(() => {
    if (!shareId) return
    let cancelled = false
    let request: AbortController | undefined
    const refresh = async () => {
      request?.abort(); request = new AbortController()
      try {
        const trip = await readSharingLink(shareId, request.signal)
        if (!cancelled && document.visibilityState === 'visible') { useAppStore.getState().setShareMode(true); setState({ id: currentTripId, trip }) }
      } catch (e) {
        if (!cancelled && !(e instanceof DOMException && e.name === 'AbortError')) setState({ id: currentTripId, error: e instanceof Error ? e.message : 'Unable to verify access.' })
      }
    }
    const resume = () => { setState({ id: currentTripId }); void refresh() }
    const hide = () => { request?.abort(); setState({ id: currentTripId }) }
    const offline = () => { request?.abort(); setState({ id: currentTripId, error: 'Reconnect to verify access to this shared itinerary.' }) }
    const visible = () => { if (document.visibilityState === 'visible') resume(); else hide() }
    void refresh()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 30000)
    window.addEventListener('focus', resume); window.addEventListener('pageshow', resume); window.addEventListener('pagehide', hide); window.addEventListener('offline', offline); window.addEventListener('online', resume); document.addEventListener('visibilitychange', visible)
    return () => { cancelled = true; request?.abort(); clearInterval(timer); window.removeEventListener('focus', resume); window.removeEventListener('pageshow', resume); window.removeEventListener('pagehide', hide); window.removeEventListener('offline', offline); window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', visible) }
  }, [currentTripId, shareId])
  return { isShared: Boolean(shareId), trip: state?.id === currentTripId ? state.trip : undefined, error: state?.id === currentTripId ? state.error : undefined }
}
