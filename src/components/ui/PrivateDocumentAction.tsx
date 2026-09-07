import { useEffect, useRef, useState } from 'react'
import { Eye, Upload } from 'lucide-react'
import type { LinkActions } from '../../types/trip'
import { DOCUMENT_TYPE_LABEL, getPrivateDoc, putPrivateDoc, type StoredDoc } from '../../lib/privateDocs'
import { Lightbox } from './Lightbox'

const buttonClass =
  'inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-blue transition-colors hover:border-blue/40'

// Renders "Add {ticket/reservation/confirmation/…}" until the traveler has
// stored that document on this device, then "View {…}" once it's there.
// The file itself lives only in this browser's IndexedDB (see
// lib/privateDocs.ts) — it's never fetched from or written to a server, so
// there's nothing here for Share mode to leak; ActionRow simply doesn't
// render this component at all in Share mode.
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
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

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

  const noun = docType ? DOCUMENT_TYPE_LABEL[docType] : 'document'
  const addLabel = `Add ${noun}`
  const viewLabel = label ?? `View ${noun}`

  const handleFile = async (file: File) => {
    await putPrivateDoc(docKey, file)
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

  if (status === 'checking') return null

  if (status === 'absent') {
    return (
      <>
        <button type="button" onClick={() => inputRef.current?.click()} className={buttonClass}>
          <Upload size={12} />
          {addLabel}
        </button>
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
      </>
    )
  }

  return (
    <>
      <button type="button" onClick={handleView} className={buttonClass}>
        <Eye size={12} />
        {viewLabel}
      </button>
      {lightboxSrc && <Lightbox src={lightboxSrc} alt={viewLabel} onClose={closeLightbox} />}
    </>
  )
}
