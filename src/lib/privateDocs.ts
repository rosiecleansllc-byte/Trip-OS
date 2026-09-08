// Device-local storage for a traveler's private documents (reservation
// confirmations, order receipts, QR-code tickets). Trip OS has no backend
// and no login by design, so there is no way to serve a "private" file
// from a server or a static host — anything under public/ or bundled into
// the JS is downloadable by anyone with the deployed URL. Instead, each
// traveler adds their own documents straight from their phone: the file
// goes into this browser's IndexedDB and never leaves the device, never
// touches git, and is never part of the deployed site.
//
// Keys are shared across a Booking/Transport/ScheduleItem trio that all
// represent the same physical document (see LinkActions.privateDocumentKey
// in types/trip.ts) — add it once, it shows up everywhere that item
// appears (Today, Bookings, Transport).

export interface StoredDoc {
  blob: Blob
  type: string // MIME type, e.g. "image/webp" or "application/pdf"
  name: string
  savedAt: number
}

const DB_NAME = 'trip-os-private-docs'
const STORE_NAME = 'docs'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

export async function putPrivateDoc(key: string, file: File): Promise<void> {
  const db = await openDb()
  const doc: StoredDoc = { blob: file, type: file.type, name: file.name, savedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(doc, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPrivateDoc(key: string): Promise<StoredDoc | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as StoredDoc | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deletePrivateDoc(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Every key currently stored — used by the Wallet's document-badge
// lookup (lib/walletDocs.ts) to know, in one IndexedDB read, which of a
// trip's many document-bearing items actually have a file saved yet,
// rather than opening one transaction per row.
export async function listPrivateDocKeys(): Promise<string[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

export const DOCUMENT_TYPE_LABEL: Record<NonNullable<import('../types/trip').LinkActions['privateDocumentType']>, string> = {
  ticket: 'ticket',
  reservation: 'reservation',
  confirmation: 'confirmation',
  receipt: 'receipt',
}

// Shared by every UI that shows a stored document's type badge
// (PrivateDocumentAction, the Wallet's document cards) so "PDF" vs "IMG"
// is decided exactly one way.
export function fileBadge(mimeType: string): 'PDF' | 'IMG' | null {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMG'
  return null
}
