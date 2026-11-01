import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { publicTripSnapshot } from '../../src/lib/tripSharing'
import { CONFIRMATION_TYPES, MAX_CONFIRMATION_BYTES, MAX_CONFIRMATIONS_TOTAL_BYTES, MAX_CONFIRMATIONS, type ConfirmationUpload, type SharedConfirmation } from '../../src/lib/sharedConfirmations'
import type { Trip } from '../../src/types/trip'

interface StoredConfirmation extends SharedConfirmation { base64: string }
interface SharedRecord { confirmations?: StoredConfirmation[]; trip: Trip; manageHash: string; createdAt: string; expiresAt: string }
export interface ShareStore {
  get(key: string, options: { type: 'json' }): Promise<SharedRecord | null>
  setJSON(key: string, value: SharedRecord, options: { onlyIfNew: true }): Promise<{ modified: boolean }>
  delete(key: string): Promise<void>
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const validId = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0', 'Netlify-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })

function parseConfirmations(value: unknown): StoredConfirmation[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_CONFIRMATIONS) throw new Error('Choose up to 10 confirmations.')
  let total = 0
  return value.map((input: ConfirmationUpload) => {
    if (!input || typeof input !== 'object' || !CONFIRMATION_TYPES.includes(input.type) || typeof input.base64 !== 'string' || (input.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))) throw new Error('Use PDF, PNG, JPEG, or WebP confirmations.')
    const bytes = Buffer.from(input.base64, 'base64')
    total += bytes.length
    if (!bytes.length || bytes.length > MAX_CONFIRMATION_BYTES || total > MAX_CONFIRMATIONS_TOTAL_BYTES) throw new Error('Confirmations must be under 2 MB each and 3 MB together.')
    const valid = input.type === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
      : input.type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : input.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
    if (!valid) throw new Error('A selected file does not match its PDF or image type.')
    // Strip control characters from displayed metadata.
    // eslint-disable-next-line no-control-regex
    const text = (v: unknown, limit: number) => typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, limit) : ''
    const title = text(input.title, 160)
    if (!title || typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid confirmation details.')
    return { id: randomUUID(), title, date: input.date, name: text(input.name, 160) || 'Confirmation', type: input.type, base64: bytes.toString('base64') }
  })
}

export function createShareHandler(store: ShareStore) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    try {
      if (request.method === 'POST') {
        if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return reply({ error: 'Origin not allowed.' }, 403)
        if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required.' }, 415)
        const reader = request.body?.getReader(); if (!reader) return reply({ error: 'Trip required.' }, 400)
        const chunks: Uint8Array[] = []; let size = 0
        try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4500 * 1024) return reply({ error: 'Trip is too large to share.' }, 413); chunks.push(value) } }
        finally { await reader.cancel() }
        const bytes = Buffer.concat(chunks)
        let trip: Trip; let confirmations: StoredConfirmation[]
        let payload
        try { payload = JSON.parse(bytes.toString('utf8')); if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error() } catch { return reply({ error: 'Invalid trip details.' }, 400) }
        if (Buffer.byteLength(JSON.stringify(payload.trip) ?? '') > 256 * 1024) return reply({ error: 'Trip is too large to share.' }, 413)
        try { trip = publicTripSnapshot(payload.trip) } catch { return reply({ error: 'Invalid trip details.' }, 400) }
        try { confirmations = parseConfirmations(payload.confirmations) } catch (e) { return reply({ error: e instanceof Error ? e.message : 'Invalid confirmations.' }, 400) }
        const id = randomUUID(); const manageToken = randomBytes(32).toString('hex'); const createdAt = new Date().toISOString()
        const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString()
        const result = await store.setJSON(id, { trip, confirmations, manageHash: hash(manageToken), createdAt, expiresAt }, { onlyIfNew: true })
        if (!result.modified) return reply({ error: 'Unable to create link. Please retry.' }, 409)
        return reply({ id, manageToken, createdAt, expiresAt }, 201)
      }
      const id = url.searchParams.get('id') ?? ''
      if (!validId(id)) return reply({ error: 'Shared trip not found.' }, 404)
      if (!['GET','DELETE'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405)
      const entry = await store.get(id, { type: 'json' })
      if (request.method === 'GET') {
        if (!entry || !Number.isFinite(Date.parse(entry.expiresAt)) || Date.parse(entry.expiresAt) <= Date.now()) {
          if (entry) await store.delete(id)
          return reply({ error: 'The owner stopped sharing this trip, or the link expired.' }, 410)
        }
        const documentId = url.searchParams.get('document')
        if (documentId !== null) {
          const doc = validId(documentId) && entry.confirmations?.find(d => d.id === documentId)
          if (!doc) return reply({ error: 'Confirmation not found.' }, 404)
          return new Response(Buffer.from(doc.base64, 'base64'), { headers: {
            'Content-Type': doc.type, 'Content-Disposition': 'inline',
            'Cache-Control': 'private, no-store, max-age=0', 'Netlify-CDN-Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'; sandbox",
          } })
        }
        return reply({ trip: publicTripSnapshot(entry.trip), confirmations: (entry.confirmations ?? []).map(({ base64: _bytes, ...doc }) => doc), createdAt: entry.createdAt, expiresAt: entry.expiresAt })
      }
      if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return reply({ error: 'Origin not allowed.' }, 403)
      if (!entry) return reply({ stopped: true })
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
      if (!/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(hash(token), 'hex'), Buffer.from(entry.manageHash, 'hex'))) return reply({ error: 'Only the link owner can stop sharing.' }, 403)
      await store.delete(id)
      return reply({ stopped: true })
    } catch (error) { console.error('Trip sharing storage operation failed', error instanceof Error ? error.name : 'UnknownError'); return reply({ error: 'Sharing is temporarily unavailable. Please try again.' }, 503) }
  }
}
