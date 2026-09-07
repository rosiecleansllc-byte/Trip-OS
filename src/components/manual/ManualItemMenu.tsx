import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { ManualTripItem, Trip } from '../../types/trip'
import { useAppStore } from '../../store/useAppStore'
import { useManualItemUiStore } from '../../store/useManualItemUiStore'
import { deletePrivateDoc } from '../../lib/privateDocs'
import { findOpenItemsToUnresolve } from '../../lib/manualItems'

// The ••• menu shown on a manually-added item (a seeded booking/transport
// leg/schedule item never gets one — see isManualId in lib/manualItems.ts,
// which callers use to decide whether to render this at all). Follows the
// same trigger + panel + inline delete-confirm pattern as
// PrivateDocumentAction for a consistent feel across the two "•••" menus
// in the app.
export function ManualItemMenu({
  item,
  trip,
  className = '',
}: {
  item: ManualTripItem
  trip: Trip
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const manualItems = useAppStore((s) => s.manualItems)
  const resolvedOpenItemIds = useAppStore((s) => s.resolvedOpenItemIds)
  const deleteManualItem = useAppStore((s) => s.deleteManualItem)
  const unresolveOpenItem = useAppStore((s) => s.unresolveOpenItem)
  const openEdit = useManualItemUiStore((s) => s.openEdit)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleDelete = async () => {
    if (item.privateDocumentKey) {
      await deletePrivateDoc(item.privateDocumentKey).catch(() => {})
    }
    deleteManualItem(item.id)
    // This item may have been the only thing still justifying a
    // resolved OpenItem (see lib/manualItems.ts) — recompute against
    // the list with it removed and flip any now-unjustified ones back
    // to open, rather than leaving a stale "resolved" behind.
    const remaining = manualItems.filter((i) => i.id !== item.id)
    for (const openItemId of findOpenItemsToUnresolve(trip, remaining, resolvedOpenItemIds)) {
      unresolveOpenItem(trip.meta.id, openItemId)
    }
    setOpen(false)
    setConfirmingDelete(false)
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setConfirmingDelete(false)
        }}
        aria-label="More options"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-blue/40"
      >
        <MoreHorizontal size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {confirmingDelete ? (
            <div className="p-2.5">
              <p className="text-xs text-ink">Delete this item?</p>
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
                  setOpen(false)
                  openEdit(item)
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-blue hover:bg-bg-soft"
              >
                Edit
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
  )
}
