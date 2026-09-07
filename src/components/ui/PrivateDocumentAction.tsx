import { useEffect, useRef, useState } from 'react'
import { Eye, MoreHorizontal, Upload } from 'lucide-react'
import type { LinkActions } from '../../types/trip'
import { DOCUMENT_TYPE_LABEL, deletePrivateDoc, getPrivateDoc, putPrivateDoc, type StoredDoc } from '../../lib/privateDocs'
import { Lightbox } from './Lightbox'

const buttonClass =
  'inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-blue transition-colors hover:border-blue/40'

function fileBadge(mimeType: string): 'PDF' | 'IMG' | null {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMG'
  return null
}

// Renders "Add {ticket/reservation/confirmation/…}" until the traveler has
// stored that document on this device, then "View {…}" once it's there,
// with a quiet ••• menu for Replace/Delete. The file itself lives only in
// this browser's IndexedDB (see lib/privateDocs.ts) — it's never fetched
// from or written to a server, so there's nothing here for Share mode to
// leak; ActionRow simply doesn't render this component at all in Share
// mode.
export function PrivateDocumentAction({
  docKey,
  label,
  docType,
}: {
  docKey: string
  label?: string
  docType?: LinkActions['privateDocumentType']
}) {
  const [status, setStatus] = useState<'checking' | 'absent' | 'present'>('checking')
  const [doc, setDoc] = useState<StoredDoc | undefined>()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const refresh = () => {
    getPrivateDoc(docKey).then((d) => {
      setDoc(d)
      setStatus(d ? 'present' : 'absent')
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  // Close the ••• menu on an outside tap.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const noun = docType ? DOCUMENT_TYPE_LABEL[docType] : 'document'
  const addLabel = `Add ${noun}`
  const viewLabel = label ?? `View ${noun}`

  const handleFile = async (file: File) => {
    await putPrivateDoc(docKey, file)
    setMenuOpen(false)
    setConfirmingDelete(false)
    refresh()
  }

  const handleDelete = async () => {
    await deletePrivateDoc(docKey)
    setMenuOpen(false)
    setConfirmingDelete(false)
    refresh()
  }

  const handleView = () => {
    if (!doc) return
    const url = URL.createObjectURL(doc.blob)
    if (doc.type === 'application/pdf') {
      window.open(url, '_blank', 'noopener')
      // A new tab needs the blob URL to stay alive, so revoke on a delay
      // rather than immediately.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return
    }
    objectUrlRef.current = url
    setLightboxSrc(url)
  }

  const closeLightbox = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setLightboxSrc(null)
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*,application/pdf"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        e.target.value = ''
      }}
    />
  )

  if (status === 'checking') return null

  if (status === 'absent') {
    return (
      <>
        <button type="button" onClick={() => inputRef.current?.click()} className={buttonClass}>
          <Upload size={12} />
          {addLabel}
        </button>
        {fileInput}
      </>
    )
  }

  const badge = doc ? fileBadge(doc.type) : null

  return (
    <div className="relative inline-flex items-center gap-1">
      <button type="button" onClick={handleView} className={buttonClass}>
        <Eye size={12} />
        {viewLabel}
        {badge && <span className="ml-0.5 text-[9px] font-semibold tracking-wide text-gray">{badge}</span>}
      </button>
      <button
        type="button"
        onClick={() => {
          setMenuOpen((v) => !v)
          setConfirmingDelete(false)
        }}
        aria-label={`More options for ${viewLabel}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-blue/40"
      >
        <MoreHorizontal size={13} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          {confirmingDelete ? (
            <div className="p-2.5">
              <p className="text-xs text-ink">Delete this {noun}?</p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-full border border-line py-1 text-xs font-medium text-ink-soft"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-full bg-red py-1 text-xs font-medium text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  inputRef.current?.click()
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="block w-full border-t border-line px-3 py-2 text-left text-xs font-medium text-red hover:bg-bg-soft"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {fileInput}
      {lightboxSrc && <Lightbox src={lightboxSrc} alt={viewLabel} onClose={closeLightbox} />}
    </div>
  )
}
