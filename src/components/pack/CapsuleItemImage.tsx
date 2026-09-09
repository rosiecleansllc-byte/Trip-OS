import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CapsuleItem, Trip } from '../../types/trip'
import { ImagePlaceholder } from '../ui/ImagePlaceholder'
import { Lightbox } from '../ui/Lightbox'
import { deleteVisualBoardImage, putVisualBoardImage, useVisualBoardImage } from '../../lib/visualBoards'
import { resolveLinkedVisualBoard, wardrobeItemImageKey } from '../../lib/wardrobeOutfits'
import { useAppStore } from '../../store/useAppStore'
import { LinkVisualSheet } from '../wardrobe/LinkVisualSheet'

// Seeded capsule items normally ship with a studio photo (item.imageUrl,
// a public asset under /public — see france-2026.ts/austin-2026.ts). A
// few don't yet (e.g. France's "Beige Banana Republic Rain Capelet"),
// which otherwise leaves the traveler unsure whether the item was ever
// meant to have a picture. This gives every imageless item its own
// private Add/Replace/Remove image affordance, plus "Use existing
// visual" — linking one of the trip's already-uploaded VisualBoards
// instead (see lib/wardrobeOutfits.ts resolveLinkedVisualBoard and
// components/wardrobe/useAutoLinkWardrobeVisuals.ts, which pre-links a
// confident match automatically). The photo itself never leaves this
// device (same IndexedDB store as every other traveler-uploaded
// visual), and item.imageUrl (the seeded field) is never touched, so
// nothing here ever needs committing to the repo.
//
// A dedicated photo always takes priority over a linked one: uploading
// one overrides whatever's linked, and removing it falls back to the
// link again (see `url` below) — so linking a shared photo now never
// blocks replacing it with this item's own dedicated photo later.
export function CapsuleItemImage({ item, trip, className }: { item: CapsuleItem; trip: Trip; className: string }) {
  const imageKey = wardrobeItemImageKey(trip, item.id)
  const [version, setVersion] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { url: dedicatedUrl } = useVisualBoardImage(imageKey, version)

  const visualBoards = useAppStore((s) => s.visualBoards)
  const wardrobeVisualLinks = useAppStore((s) => s.wardrobeVisualLinks)
  const linkWardrobeVisual = useAppStore((s) => s.linkWardrobeVisual)
  const unlinkWardrobeVisual = useAppStore((s) => s.unlinkWardrobeVisual)
  const linkedBoard = resolveLinkedVisualBoard(trip, item.id, visualBoards, wardrobeVisualLinks)
  const { url: linkedUrl } = useVisualBoardImage(linkedBoard?.imageKey)

  if (item.imageUrl) {
    return <ImagePlaceholder label={item.name} imageUrl={item.imageUrl} className={className} />
  }

  const url = dedicatedUrl ?? linkedUrl
  const isLinkedOnly = !dedicatedUrl && Boolean(linkedUrl)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      await putVisualBoardImage(imageKey, file)
      setVersion((v) => v + 1)
    } catch {
      setError("Couldn't save that image. Try again.")
    }
  }

  const handleRemove = async () => {
    setError(null)
    try {
      await deleteVisualBoardImage(imageKey)
      setVersion((v) => v + 1)
    } catch {
      setError("Couldn't remove the image. Try again.")
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => (url ? setLightboxOpen(true) : inputRef.current?.click())}
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-bg-soft text-gray"
      >
        {url ? (
          <img src={url} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <>
            <Plus size={20} strokeWidth={1.5} />
            <span className="px-2 text-center text-[11px] leading-tight text-blue">Add image</span>
          </>
        )}
      </button>

      {!url && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="absolute inset-x-0 bottom-0 bg-ink/55 py-1 text-[10px] font-medium text-white"
        >
          Use existing visual
        </button>
      )}

      {url && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-ink/55 py-1">
          <button type="button" onClick={() => inputRef.current?.click()} className="text-[10px] font-medium text-white">
            {isLinkedOnly ? 'Add photo' : 'Replace'}
          </button>
          <button
            type="button"
            onClick={() => (isLinkedOnly ? unlinkWardrobeVisual(trip.meta.id, item.id) : void handleRemove())}
            className="text-[10px] font-medium text-white"
          >
            {isLinkedOnly ? 'Unlink' : 'Remove'}
          </button>
        </div>
      )}

      {error && <p className="absolute inset-x-0 bottom-full mb-1 text-center text-[10px] text-red">{error}</p>}
      {url && lightboxOpen && <Lightbox src={url} alt={item.name} onClose={() => setLightboxOpen(false)} />}
      {pickerOpen && (
        <LinkVisualSheet
          trip={trip}
          onSelect={(visualBoardId) => {
            linkWardrobeVisual(trip.meta.id, item.id, visualBoardId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
