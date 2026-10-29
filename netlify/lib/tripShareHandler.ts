import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { publicTripSnapshot } from '../../src/lib/tripSharing'
import type { Trip } from '../../src/types/trip'

interface SharedRecord { trip: Trip; manageHash: string; createdAt: string; expiresAt: string }
export interface ShareStore {
  get(key: string, options: { type: 'json' }): Promise<SharedRecord | null>
  setJSON(key: string, value: SharedRecord, options: { onlyIfNew: true }): Promise<{ modified: boolean }>
  delete(key: string): Promise<void>
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const validId = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0', 'Netlify-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })

export function createShareHandler(store: ShareStore) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    try {
      if (request.method === 'POST') {
        if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return reply({ error: 'Origin not allowed.' }, 403)
        if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required.' }, 415)
        const reader = request.body?.getReader(); if (!reader) return reply({ error: 'Trip required.' }, 400)
        const chunks: Uint8Array[] = []; let size = 0
        try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 256 * 1024) return reply({ error: 'Trip is too large to share.' }, 413); chunks.push(value) } }
        finally { await reader.cancel() }
        const bytes = Buffer.concat(chunks)
        let trip: Trip
        try { trip = publicTripSnapshot(JSON.parse(bytes.toString('utf8')).trip) } catch { return reply({ error: 'Invalid trip details.' }, 400) }
        const id = randomUUID(); const manageToken = randomBytes(32).toString('hex'); const createdAt = new Date().toISOString()
        const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString()
        const result = await store.setJSON(id, { trip, manageHash: hash(manageToken), createdAt, expiresAt }, { onlyIfNew: true })
        if (!result.modified) return reply({ error: 'Unable to create link. Please retry.' }, 409)
        return reply({ id, manageToken, createdAt, expiresAt }, 201)
      }
      const id = url.searchParams.get('id') ?? ''
      if (!validId(id)) return reply({ error: 'Shared trip not found.' }, 404)
      if (!['GET','DELETE'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405)
      const entry = await store.get(id, { type: 'json' })
      if (request.method === 'GET') {
        if (!entry || Date.parse(entry.expiresAt) <= Date.now()) return reply({ error: 'The owner stopped sharing this trip, or the link expired.' }, 410)
        return reply({ trip: publicTripSnapshot(entry.trip), createdAt: entry.createdAt, expiresAt: entry.expiresAt })
      }
      if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return reply({ error: 'Origin not allowed.' }, 403)
      if (!entry) return reply({ stopped: true })
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
      if (!/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(hash(token), 'hex'), Buffer.from(entry.manageHash, 'hex'))) return reply({ error: 'Only the link owner can stop sharing.' }, 403)
      await store.delete(id)
      return reply({ stopped: true })
    } catch { return reply({ error: 'Sharing is temporarily unavailable. Please try again.' }, 503) }
  }
}
