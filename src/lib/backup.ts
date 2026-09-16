import { getPrivateDoc, listPrivateDocKeys, putStoredDoc, type StoredDoc } from './privateDocs'
import {
  getVisualBoardImage,
  listVisualBoardImageKeys,
  putStoredBoardImage,
  type StoredBoardImage,
} from './visualBoards'
import { APP_STATE_STORAGE_KEY } from '../store/useAppStore'

// Trip OS has no backend and no login: everything Cecilia adds lives in
// this browser's own storage for this origin. That storage is per-browsing-
// context, and iOS gives a Home Screen web app a different context from
// Safari — so an installed copy cannot read what Safari saved, and no
// manifest setting, scope, service worker or storage API changes that.
// A backup file is the only way to move her data between the two.
//
// Three stores have to travel together or a restore silently half-works:
//
//   localStorage['trip-os-app-state']  the Zustand blob — checklist state,
//                                      manual items, overrides, outfits,
//                                      and the METADATA for every photo
//   IndexedDB trip-os-private-docs     confirmation PDFs, boarding passes
//   IndexedDB trip-os-visual-boards    the actual photo bytes
//
// The join between the first and last is a bare string (VisualBoard.
// imageKey, LinkActions.privateDocumentKey). Exporting only the Zustand
// blob — the easy thing — restores boards whose images resolve to
// "missing" and documents whose buttons say "Add", which looks like a
// successful restore and is not.

export const BACKUP_FORMAT = 'trip-os-backup'
export const BACKUP_VERSION = 1

interface BackupBlob {
  key: string
  name: string
  type: string
  savedAt: number
  data: string // base64, no data: prefix
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appState: unknown
  privateDocs: BackupBlob[]
  visualBoardImages: BackupBlob[]
}

export interface BackupContents {
  privateDocs: number
  visualBoardImages: number
  hasAppState: boolean
}

// Chunked so a multi-megabyte photo doesn't blow the argument limit on
// String.fromCharCode the way a single spread over the whole array would.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
}

async function encodeBlob(key: string, stored: StoredDoc | StoredBoardImage): Promise<BackupBlob> {
  const buffer = await stored.blob.arrayBuffer()
  return {
    key,
    name: stored.name,
    type: stored.type,
    savedAt: stored.savedAt,
    data: bytesToBase64(new Uint8Array(buffer)),
  }
}

function decodeBlob(entry: BackupBlob): StoredDoc {
  return {
    blob: new Blob([base64ToBytes(entry.data)], { type: entry.type }),
    type: entry.type,
    name: entry.name,
    savedAt: entry.savedAt,
  }
}

export async function createBackup(): Promise<BackupFile> {
  const raw = localStorage.getItem(APP_STATE_STORAGE_KEY)
  const [docKeys, imageKeys] = await Promise.all([listPrivateDocKeys(), listVisualBoardImageKeys()])

  const privateDocs: BackupBlob[] = []
  for (const key of docKeys) {
    const stored = await getPrivateDoc(key)
    if (stored) privateDocs.push(await encodeBlob(key, stored))
  }

  const visualBoardImages: BackupBlob[] = []
  for (const key of imageKeys) {
    const stored = await getVisualBoardImage(key)
    if (stored) visualBoardImages.push(await encodeBlob(key, stored))
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appState: raw ? JSON.parse(raw) : null,
    privateDocs,
    visualBoardImages,
  }
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a Trip OS backup.")
  }
  const file = parsed as Partial<BackupFile>
  if (file?.format !== BACKUP_FORMAT) {
    throw new Error("That file isn't a Trip OS backup.")
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of Trip OS. Update this device first.')
  }
  return {
    format: BACKUP_FORMAT,
    version: file.version,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    appState: file.appState ?? null,
    privateDocs: Array.isArray(file.privateDocs) ? file.privateDocs : [],
    visualBoardImages: Array.isArray(file.visualBoardImages) ? file.visualBoardImages : [],
  }
}

export function describeBackup(file: BackupFile): BackupContents {
  return {
    privateDocs: file.privateDocs.length,
    visualBoardImages: file.visualBoardImages.length,
    hasAppState: file.appState !== null && file.appState !== undefined,
  }
}

export interface RestoreResult {
  addedDocs: number
  addedImages: number
  addedStateKeys: number
  skippedExisting: number
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasId(value: unknown): value is { id: string } {
  return isPlainRecord(value) && typeof value.id === 'string'
}

// Restore only ever ADDS. Anything already on this device wins: an
// existing array entry with the same id is kept, an existing map key is
// kept, an existing stored file is kept. That makes importing safe to do
// onto a device that already has data — it can't overwrite this device's
// work with a stale copy, and it can't delete anything. The cost is that
// re-importing after editing the same record in both places keeps the
// local edit, which is the right way round for a recovery tool.
function mergeStateValue(local: unknown, incoming: unknown, counter: { added: number; skipped: number }): unknown {
  if (Array.isArray(local) && Array.isArray(incoming)) {
    const localIds = new Set(local.filter(hasId).map((v) => v.id))
    const additions = incoming.filter((v) => !hasId(v) || !localIds.has(v.id))
    counter.added += additions.length
    counter.skipped += incoming.length - additions.length
    return [...local, ...additions]
  }
  if (isPlainRecord(local) && isPlainRecord(incoming)) {
    const merged: Record<string, unknown> = { ...local }
    for (const [key, value] of Object.entries(incoming)) {
      if (key in merged) {
        counter.skipped += 1
        continue
      }
      merged[key] = value
      counter.added += 1
    }
    return merged
  }
  // Scalars (currentTripId, shareMode, notificationsRequested): whatever
  // this device already decided stays.
  return local
}

export async function restoreBackup(file: BackupFile): Promise<RestoreResult> {
  const counter = { added: 0, skipped: 0 }

  if (isPlainRecord(file.appState)) {
    const incomingState = isPlainRecord(file.appState.state) ? file.appState.state : {}
    const rawLocal = localStorage.getItem(APP_STATE_STORAGE_KEY)
    const localParsed = rawLocal ? (JSON.parse(rawLocal) as unknown) : null
    const localWrapper = isPlainRecord(localParsed) ? localParsed : {}
    const localState = isPlainRecord(localWrapper.state) ? localWrapper.state : {}

    const mergedState: Record<string, unknown> = { ...localState }
    for (const [key, incomingValue] of Object.entries(incomingState)) {
      mergedState[key] = key in localState ? mergeStateValue(localState[key], incomingValue, counter) : incomingValue
      if (!(key in localState)) counter.added += 1
    }

    localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({ ...localWrapper, state: mergedState, version: localWrapper.version ?? file.appState.version ?? 0 })
    )
  }

  const existingDocKeys = new Set(await listPrivateDocKeys())
  let addedDocs = 0
  for (const entry of file.privateDocs) {
    if (existingDocKeys.has(entry.key)) {
      counter.skipped += 1
      continue
    }
    await putStoredDoc(entry.key, decodeBlob(entry))
    addedDocs += 1
  }

  const existingImageKeys = new Set(await listVisualBoardImageKeys())
  let addedImages = 0
  for (const entry of file.visualBoardImages) {
    if (existingImageKeys.has(entry.key)) {
      counter.skipped += 1
      continue
    }
    await putStoredBoardImage(entry.key, decodeBlob(entry))
    addedImages += 1
  }

  return {
    addedDocs,
    addedImages,
    addedStateKeys: counter.added,
    skippedExisting: counter.skipped,
  }
}

export function backupFileName(): string {
  return `trip-os-backup-${new Date().toISOString().slice(0, 10)}.json`
}

// Whether this browsing context has ever saved Trip OS data. Checked
// against the raw key rather than the store, because once Zustand
// rehydrates, "no saved data" and "saved data that happens to be empty"
// look identical.
export function hasSavedData(): boolean {
  try {
    return localStorage.getItem(APP_STATE_STORAGE_KEY) !== null
  } catch {
    return false
  }
}
