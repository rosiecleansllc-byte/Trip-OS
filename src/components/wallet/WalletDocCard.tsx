import { useEffect, useRef, useState } from 'react'
import { Eye, MoreHorizontal, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import type { WalletDocEntry } from '../../lib/walletDocs'
import {
  DOCUMENT_TYPE_LABEL,
  deletePrivateDoc,
  fileBadge,
  getPrivateDoc,
  putPrivateDoc,
  type StoredDoc,
} from '../../lib/privateDocs'
import { formatDateCompact, formatTime } from '../../lib/date'
import { Card } from '../ui/Card'
import { Lightbox } from '../ui/Lightbox'

// One document-bearing item in the Wallet — owns its own View/Add/
// Replace/Delete lifecycle by reading/writing lib/privateDocs.ts
// directly, the same pattern PrivateDocumentAction and (for visual
// boards) VisualBoardCard already use. A full-variant row here and an
// ActionRow's inline PrivateDocumentAction pill elsewhere both end up
// pointing at the exact same IndexedDB record when they share a
// privateDocumentKey, so replacing/deleting from either place is
// immediately reflected in the other next time it checks.
export function WalletDocCard({
  entry,
  variant = 'full',
  className = '',
}: {
  entry: WalletDocEntry
  variant?: 'full' | 'compact'
  className?: string
}) {
  const [status, setStatus] = useState<'checking' | 'absent' | 'present'>('checking')
  const [doc, setDoc] = useState<StoredDoc | undefined>()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Surfaced on failure rather than swallowed — a failed Delete must
  // never look like it succeeded (see the same fix applied to
  // VisualBoardCard): silently proceeding here would either show a
  // stale/missing file as if nothing happened, or (worse, for Delete)
  // there's no metadata record to orphan since a Wallet entry is derived
  // from the trip data itself, but the traveler still deserves to know
  // the actual file wasn't removed from their device.
  const [actionError, setActionError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const refresh = () => {
    getPrivateDoc(entry.privateDocumentKey)
      .then((d) => {
        setDoc(d)
        setStatus(d ? 'present' : 'absent')
      })
      .catch(() => {
        setDoc(undefined)
        setStatus('absent')
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.privateDocumentKey])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

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

  const noun = entry.privateDocumentType ? DOCUMENT_TYPE_LABEL[entry.privateDocumentType] : 'document'
  const viewLabel = entry.privateDocumentLabel ?? `View ${noun}`

  const handleFile = async (file: File) => {
    setActionError(null)
    try {
      await putPrivateDoc(entry.privateDocumentKey, file)
      setMenuOpen(false)
      setConfirmingDelete(false)
      refresh()
    } catch {
      setActionError(`Couldn't save the ${noun}. Try again.`)
    }
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await deletePrivateDoc(entry.privateDocumentKey)
      setMenuOpen(false)
      setConfirmingDelete(false)
      refresh()
    } catch {
      setActionError(`Couldn't delete the ${noun}. Try again.`)
      setMenuOpen(false)
      setConfirmingDelete(false)
    }
  }

  const handleView = () => {
    if (!doc) return
    const url = URL.createObjectURL(doc.blob)
    if (doc.type === 'application/pdf') {
      window.open(url, '_blank', 'noopener')
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
        e.target.value = ''
        if (file) void handleFile(file)
      }}
    />
  )

  const badge = doc ? fileBadge(doc.type) : null
  const dateLabel = `${formatDateCompact(entry.date)}${entry.time ? ` · ${formatTime(entry.time)}` : ''}`

  if (variant === 'compact') {
    return (
      <div className={clsx('flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5', className)}>
        {fileInput}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink">{entry.title}</p>
          <p className="truncate text-[11px] text-ink-soft">{dateLabel}</p>
        </div>
        {status === 'present' ? (
          <button
            type="button"
            onClick={handleView}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-blue"
          >
            {viewLabel}
          </button>
        ) : status === 'absent' ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-blue"
          >
            Add {noun}
          </button>
        ) : null}
        {lightboxSrc && <Lightbox src={lightboxSrc} alt={viewLabel} onClose={closeLightbox} />}
      </div>
    )
  }

  return (
    <Card className={clsx('p-3.5', className)}>
      {fileInput}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
            <span>{dateLabel}</span>
            {entry.legName && <span>· {entry.legName}</span>}
          </p>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          {status === 'present' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleView}
                className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-blue"
              >
                <Eye size={12} />
                View
                {badge && <span className="ml-0.5 text-[9px] font-semibold tracking-wide text-gray">{badge}</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((v) => !v)
                  setConfirmingDelete(false)
                }}
                aria-label={`More options for ${entry.title}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-soft"
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          ) : status === 'absent' ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-blue"
            >
              <Upload size={12} />
              Add {noun}
            </button>
          ) : null}

          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
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
        </div>
      </div>
      {actionError && <p className="mt-2 text-[11px] text-red">{actionError}</p>}
      {lightboxSrc && <Lightbox src={lightboxSrc} alt={viewLabel} onClose={closeLightbox} />}
    </Card>
  )
}
