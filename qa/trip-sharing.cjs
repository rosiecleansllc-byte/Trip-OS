const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
const { createTrip } = require('../src/lib/createTrip.ts')
const { publicTripSnapshot } = require('../src/lib/tripSharing.ts')
const { createShareHandler } = require('../netlify/lib/tripShareHandler.ts')
async function run() {
  const source = createTrip({ name: 'Shared test trip — Perú', destination: 'Lima', startDate: '2026-11-05', endDate: '2026-11-16', timeZone: 'America/Lima', currency: 'PEN', travelers: 'Test Traveler' }, 'peru-2026')
  source.meta.coverImageUrl = 'blob:PRIVATE_IMAGE'
  source.meta.budgetNote = 'PRIVATE_BUDGET_NOTE'
  source.bookings.push({ id: 'stay', name: 'Shared hotel', category: 'hotel', dateStart: '2026-11-06', status: 'paid', cost: { amount: 100, currency: 'USD' }, confirmationCode: 'PRIVATE_CODE', notes: 'PRIVATE_NOTES', privateTicketUrl: 'https://example.com/PRIVATE_TICKET', modifyUrl: 'https://example.com/PRIVATE_MODIFY', privateDocumentKey: 'PRIVATE_DOC', websiteUrl: 'https://example.com' })
  source.transport.push({ id: 'flight', mode: 'flight', from: 'ATL', to: 'LIM', date: '2026-11-05', status: 'confirmed', number: 'CM263', notes: 'PRIVATE_TRANSPORT_NOTE', privateDocumentKey: 'PRIVATE_DOC' })
  source.days[0].scheduleItems.push({ id: 'hidden', label: 'PRIVATE_EVENT', type: 'free', isPrivate: true }, { id: 'visible', label: 'Shared activity', type: 'activity', notes: 'PRIVATE_SCHEDULE_NOTE', websiteUrl: 'javascript:alert(1)', privateDocumentKey: 'PRIVATE_DOC' })
  const safe = publicTripSnapshot(source)
  const raw = JSON.stringify(safe)
  assert(!raw.includes('PRIVATE_'))
  assert(!raw.includes('javascript:'))
  assert.equal(safe.bookings[0].cost.amount, 100)
  assert.equal(safe.transport[0].number, 'CM263')
  assert.equal(safe.days[0].scheduleItems.length, 1)
  assert.throws(() => publicTripSnapshot({ ...source, meta: { ...source.meta, startDate: '2026-02-30' } }))
  assert.equal(source.bookings[0].confirmationCode, 'PRIVATE_CODE')
  const data = new Map()
  const store = { get: async id => structuredClone(data.get(id) ?? null), setJSON: async (id, value) => { if (data.has(id)) return { modified: false }; data.set(id, structuredClone(value)); return { modified: true } }, delete: async id => { data.delete(id) } }
  const handler = createShareHandler(store)
  const request = (method, id, body, token) => new Request('https://example.com/.netlify/functions/trip-share' + (id ? '?id=' + id : ''), { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const createdResponse = await handler(request('POST', null, { trip: source }))
  assert.equal(createdResponse.status, 201)
  const created = await createdResponse.json()
  assert.equal(created.manageToken.length, 64)
  assert(!JSON.stringify(data.get(created.id)).includes(created.manageToken))
  assert(!JSON.stringify(data.get(created.id)).includes('PRIVATE_'))
  const readResponse = await handler(request('GET', created.id))
  assert.equal(readResponse.status, 200)
  assert(readResponse.headers.get('Cache-Control').includes('no-store'))
  const read = await readResponse.json()
  assert.equal(read.trip.meta.name, source.meta.name)
  assert(!JSON.stringify(read).includes('manageHash'))
  assert(!JSON.stringify(read).includes(created.manageToken))
  assert.equal((await handler(request('DELETE', created.id, null, '0'.repeat(64)))).status, 403)
  assert.equal((await handler(request('GET', created.id))).status, 200)
  const second = await (await handler(request('POST', null, { trip: source }))).json()
  assert.equal((await handler(request('DELETE', created.id, null, created.manageToken))).status, 200)
  assert.equal((await handler(request('GET', created.id))).status, 410)
  assert.equal((await handler(request('DELETE', created.id, null, created.manageToken))).status, 200)
  assert.equal((await handler(request('GET', second.id))).status, 200)
  data.get(second.id).expiresAt = '2000-01-01T00:00:00Z'
  assert.equal((await handler(request('GET', second.id))).status, 410)
  assert.equal((await handler(request('POST', null, { trip: { bad: true } }))).status, 400)
  assert.equal((await handler(request('POST', null, { trip: source, junk: 'x'.repeat(4500 * 1024) }))).status, 413)
  assert.equal((await handler(new Request('https://example.com/.netlify/functions/trip-share', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.test' }, body: JSON.stringify({ trip: source }) }))).status, 403)
  // Synthetic selected document only: no device files or production storage.
  const pdf = { title: 'Dinner confirmation', date: '2026-11-10', name: 'dinner.pdf', type: 'application/pdf', base64: Buffer.from('%PDF-1.7\nSELECTED_CONFIRMATION').toString('base64') }
  const withDocsResponse = await handler(request('POST', null, { trip: source, confirmations: [pdf] }))
  assert.equal(withDocsResponse.status, 201)
  const withDocs = await withDocsResponse.json()
  const documentRequest = (id, doc) => new Request(`https://example.com/.netlify/functions/trip-share?id=${id}&document=${doc}`)
  const metadata = await (await handler(request('GET', withDocs.id))).json()
  assert.equal(metadata.confirmations.length, 1)
  assert.equal(metadata.confirmations[0].title, pdf.title)
  assert(!JSON.stringify(metadata).includes('SELECTED_CONFIRMATION'))
  assert(!JSON.stringify(metadata).includes('base64'))
  assert(!JSON.stringify(metadata).includes('PRIVATE_'))
  const docId = metadata.confirmations[0].id
  const file = await handler(documentRequest(withDocs.id, docId))
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('Content-Type'), 'application/pdf')
  assert(file.headers.get('Cache-Control').includes('no-store'))
  assert(file.headers.get('Content-Security-Policy').includes('sandbox'))
  assert.equal(await file.text(), Buffer.from(pdf.base64, 'base64').toString())
  const other = await (await handler(request('POST', null, { trip: source }))).json()
  assert.equal((await handler(documentRequest(other.id, docId))).status, 404)
  assert.equal((await handler(documentRequest(withDocs.id, '../anything'))).status, 404)
  assert.equal((await handler(request('DELETE', withDocs.id, null, withDocs.manageToken))).status, 200)
  assert.equal((await handler(documentRequest(withDocs.id, docId))).status, 410)
  assert(!data.has(withDocs.id)) // revocation removes selected bytes too
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: [{ ...pdf, type: 'text/html' }] }))).status, 400)
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: [{ ...pdf, base64: Buffer.from('<html>fake PDF</html>').toString('base64') }] }))).status, 400)
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: [{ ...pdf, base64: '!!!!' }] }))).status, 400)
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: Array(11).fill(pdf) }))).status, 400)
  const oversized = { ...pdf, base64: Buffer.from('%PDF-' + 'x'.repeat(2 * 1024 * 1024)).toString('base64') }
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: [oversized] }))).status, 400)
  const large = { ...pdf, base64: Buffer.from('%PDF-' + 'x'.repeat(1600 * 1024)).toString('base64') }
  assert.equal((await handler(request('POST', null, { trip: source, confirmations: [large, large] }))).status, 400)
  const expiring = await (await handler(request('POST', null, { trip: source, confirmations: [pdf] }))).json()
  const expiringDoc = data.get(expiring.id).confirmations[0].id
  data.get(expiring.id).expiresAt = '2000-01-01T00:00:00Z'
  assert.equal((await handler(documentRequest(expiring.id, expiringDoc))).status, 410)
  assert.equal((await handler(request('POST', null, null))).status, 400)
  // Exercise the owner-to-recipient client path with a synthetic device file.
  const privateDocs = require('../src/lib/privateDocs.ts')
  const originalRead = privateDocs.getPrivateDoc
  const originalFetch = global.fetch
  const originalReader = global.FileReader
  const reads = []
  privateDocs.getPrivateDoc = async key => {
    reads.push(key)
    return { blob: new Blob(['%PDF-1.7\nCLIENT_SELECTED_ONLY'], { type: 'application/pdf' }), name: 'synthetic.pdf' }
  }
  global.FileReader = class {
    readAsDataURL(blob) { blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload() }) }
  }
  let submitted
  global.fetch = async (url, options) => {
    submitted = options.body ? JSON.parse(options.body) : submitted
    return handler(new Request('https://example.com' + url, options))
  }
  try {
    const { createSharingLink, readSharingLink } = require('../src/lib/revocableSharing.ts')
    source.bookings.push({ ...source.bookings[0], id: 'unselected', privateDocumentKey: 'UNSELECTED_DOC' })
    const clientLink = await createSharingLink(source, ['PRIVATE_DOC'])
    assert.deepEqual(reads, ['PRIVATE_DOC'])
    assert.equal(submitted.confirmations.length, 1)
    assert(!JSON.stringify(submitted).includes('PRIVATE_DOC'))
    assert(!JSON.stringify(submitted).includes('UNSELECTED_DOC'))
    const received = await readSharingLink(clientLink.id)
    assert.equal(received.sharedConfirmations.length, 1)
    assert.equal(received.meta.sharedLinkId, clientLink.id)
    assert(!JSON.stringify(received).includes('base64'))
    reads.length = 0
    await createSharingLink(source)
    assert.deepEqual(reads, [])
    assert.deepEqual(submitted.confirmations, [])
    await assert.rejects(createSharingLink(source, ['missing']), /no longer saved/)
  } finally {
    privateDocs.getPrivateDoc = originalRead
    global.fetch = originalFetch
    global.FileReader = originalReader
  }
  console.log('PASS: selected confirmation delivery, metadata-only listing, file format/size validation, document isolation/revocation/expiry, custom itinerary transfer, Unicode, private-field exclusion, unsafe URL removal, create/read/revoke lifecycle, unauthorized revocation denied, separate-link isolation, expiry, no-cache headers, input bounds, source preservation')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
