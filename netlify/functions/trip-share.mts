import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
import { createShareHandler, type ShareStore } from '../lib/tripShareHandler'

export default async (request: Request, context: Context) => {
  // Preview tests cannot access production shares.
  const name = context.deploy.context === 'production' ? 'trip-os-shares-v1' : `trip-os-shares-preview-${context.deploy.id}`
  try {
    const store = getStore({ name, consistency: 'strong' })
    return await createShareHandler(store as ShareStore)(request)
  } catch {
    return Response.json({ error: 'Sharing storage is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
export const config: Config = {
  method: ['GET', 'POST', 'DELETE'],
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 120 },
}
