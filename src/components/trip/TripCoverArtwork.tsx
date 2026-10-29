import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { getVisualBoardImage, putVisualBoardImage } from '../../lib/visualBoards'
import { ImagePlaceholder } from '../ui/ImagePlaceholder'

const COVER_CHANGED = 'trip-cover-changed'
const tripCoverKey = (tripId: string) => `trip-cover:${tripId}`

// Reuse the private image store: backup/restore already includes every key.
// Only blob URLs reach the UI; user uploads never enter the public bundle.
function useTripCover(tripId: string) {
  const shareMode = useAppStore(s => s.shareMode)
  const [revision, setRevision] = useState(0)
  const [image, setImage] = useState<{ tripId: string; url: string }>()
  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent<string>).detail === tripId) setRevision(value => value + 1)
    }
    window.addEventListener(COVER_CHANGED, changed)
    return () => window.removeEventListener(COVER_CHANGED, changed)
  }, [tripId])
  useEffect(() => {
    if (shareMode) return
    let cancelled = false
    let url: string | undefined
    getVisualBoardImage(tripCoverKey(tripId)).then(stored => {
      if (cancelled) return
      if (stored) url = URL.createObjectURL(stored.blob)
      setImage(url ? { tripId, url } : undefined)
    }).catch(() => { if (!cancelled) setImage(undefined) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [tripId, revision, shareMode])
  return !shareMode && image?.tripId === tripId ? image.url : undefined
}

export function TripCoverImage({ trip }: { trip: Trip }) {
  const uploadedCover = useTripCover(trip.meta.id)
  return <ImagePlaceholder
    label={uploadedCover ? `${trip.meta.name} uploaded cover artwork` : trip.meta.coverAlt ?? `${trip.meta.name} cover artwork`}
    imageUrl={uploadedCover ?? trip.meta.coverImageUrl}
    fit="cover" className="h-full w-full"
    style={!uploadedCover && trip.meta.coverPosition ? { objectPosition: trip.meta.coverPosition } : undefined}
  />
}

export function TripCoverEditor({ trip }: { trip: Trip }) {
  const shareMode = useAppStore(s => s.shareMode)
  const uploadedCover = useTripCover(trip.meta.id)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage('')
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) {
      setMessage('Choose a JPG, PNG, WebP, GIF, or AVIF image.'); return
    }
    if (file.size > 15 * 1024 * 1024) { setMessage('Choose an image smaller than 15 MB.'); return }
    setBusy(true)
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      await putVisualBoardImage(tripCoverKey(trip.meta.id), file)
      window.dispatchEvent(new CustomEvent(COVER_CHANGED, { detail: trip.meta.id }))
      setMessage('Cover artwork saved.')
    } catch { setMessage('Unable to save this image. Try another image or free up device storage.') }
    finally { URL.revokeObjectURL(url); setBusy(false) }
  }
  if (shareMode) return null
  return <div className="space-y-1.5">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label={`Cover artwork for ${trip.meta.name}`} onChange={upload} className="hidden" />
    <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-blue disabled:opacity-50">
      {busy ? 'Saving cover…' : uploadedCover ? 'Replace cover artwork' : 'Upload cover artwork'}
    </button>
    <p className="text-[11px] text-ink-soft">Choose a photo or artwork. Saved on this device and included in backups.</p>
    {message && <p role="status" className="text-xs text-ink-soft">{message}</p>}
  </div>
}
