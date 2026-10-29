import { useEffect, useRef, useState, type PointerEvent, type ChangeEvent } from 'react'
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
  const position = useAppStore(s => s.tripCoverPositions[trip.meta.id])
  return <ImagePlaceholder
    label={uploadedCover ? `${trip.meta.name} uploaded cover artwork` : trip.meta.coverAlt ?? `${trip.meta.name} cover artwork`}
    imageUrl={uploadedCover ?? trip.meta.coverImageUrl}
    fit="cover" className="h-full w-full"
    style={{ objectPosition: uploadedCover ? `${position?.x ?? 50}% ${position?.y ?? 50}%` : trip.meta.coverPosition }}
  />
}

export function TripCoverEditor({ trip }: { trip: Trip }) {
  const shareMode = useAppStore(s => s.shareMode)
  const uploadedCover = useTripCover(trip.meta.id)
  const position = useAppStore(s => s.tripCoverPositions[trip.meta.id])
  const setPosition = useAppStore(s => s.setTripCoverPosition)
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ id: number; x: number; y: number; position: { x: number; y: number }; overflowX: number; overflowY: number } | null>(null)
  function startDrag(event: PointerEvent<HTMLImageElement>) {
    if (!draft || !event.isPrimary || event.button !== 0) return
    const image = event.currentTarget
    const rect = image.getBoundingClientRect()
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
    if (!Number.isFinite(scale)) return
    image.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position: draft, overflowX: image.naturalWidth * scale - rect.width, overflowY: image.naturalHeight * scale - rect.height }
  }
  function moveDrag(event: PointerEvent<HTMLImageElement>) {
    const start = drag.current
    if (!start || event.pointerId !== start.id) return
    const clamp = (value: number) => Math.max(0, Math.min(100, value))
    setDraft({
      x: start.overflowX > 0.5 ? clamp(start.position.x - (event.clientX - start.x) / start.overflowX * 100) : start.position.x,
      y: start.overflowY > 0.5 ? clamp(start.position.y - (event.clientY - start.y) / start.overflowY * 100) : start.position.y,
    })
  }
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
      setPosition(trip.meta.id, { x: 50, y: 50 })
      setDraft({ x: 50, y: 50 })
      window.dispatchEvent(new CustomEvent(COVER_CHANGED, { detail: trip.meta.id }))
      setMessage('Cover artwork saved. Reposition it below, then save the position.')
    } catch { setMessage('Unable to save this image. Try another image or free up device storage.') }
    finally { URL.revokeObjectURL(url); setBusy(false) }
  }
  if (shareMode) return null
  return <div className="space-y-1.5">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label={`Cover artwork for ${trip.meta.name}`} onChange={upload} className="hidden" />
    <div className="flex flex-wrap gap-2">
    <button type="button" disabled={busy || Boolean(draft)} onClick={() => input.current?.click()} className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-blue disabled:opacity-50">
      {busy ? 'Saving cover…' : uploadedCover ? 'Replace cover artwork' : 'Upload cover artwork'}
    </button>
    {uploadedCover && !draft && <button type="button" onClick={() => { setDraft(position ?? { x: 50, y: 50 }); setMessage('') }} className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-blue">Reposition artwork</button>}
    </div>
    {uploadedCover && draft && <div className="space-y-3 rounded-xl border border-line p-3">
      <p className="text-sm font-medium">Move cover artwork</p>
      <p className="text-xs text-ink-soft">Drag the image to frame your cover, or use the sliders. Only the cropped direction moves; the image always fills the cover.</p>
      <div className="-mx-7 h-72 overflow-hidden bg-bg-soft">
        <img src={uploadedCover} alt="Cover position preview" draggable={false} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }} style={{ objectPosition: `${draft.x}% ${draft.y}%`, touchAction: 'none' }} className="h-full w-full cursor-grab select-none object-cover active:cursor-grabbing" />
      </div>
      <label className="block text-xs">Horizontal position · left to right
        <input type="range" min="0" max="100" step="1" value={draft.x} onChange={event => setDraft({ ...draft, x: Number(event.target.value) })} className="mt-2 block w-full accent-blue" />
      </label>
      <label className="block text-xs">Vertical position · top to bottom
        <input type="range" min="0" max="100" step="1" value={draft.y} onChange={event => setDraft({ ...draft, y: Number(event.target.value) })} className="mt-2 block w-full accent-blue" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setPosition(trip.meta.id, draft); setDraft(null); setMessage('Cover position saved.') }} className="rounded-xl bg-blue px-3 py-2 text-xs font-medium text-white">Save position</button>
        <button type="button" onClick={() => { setDraft(null); setMessage('') }} className="rounded-xl border border-line px-3 py-2 text-xs">Cancel</button>
        <button type="button" onClick={() => setDraft({ x: 50, y: 50 })} className="rounded-xl border border-line px-3 py-2 text-xs">Center image</button>
      </div>
    </div>}
    <p className="text-[11px] text-ink-soft">Choose a photo or artwork. Saved on this device and included in backups.</p>
    {message && <p role="status" className="text-xs text-ink-soft">{message}</p>}
  </div>
}
