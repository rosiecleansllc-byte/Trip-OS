// QA: backup export -> fresh storage container -> restore -> everything back.
// This simulates the Safari -> installed-PWA transition by using two
// isolated browser contexts (separate storage partitions), which is the
// closest faithful model of iOS's behavior available off-device.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pkg

const BASE = 'http://localhost:5187'
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

// ---------- Container A: "Safari" — build up real user data ----------
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
const a = await ctxA.newPage()
await a.goto(BASE + '/', { waitUntil: 'networkidle' })
await a.waitForTimeout(500)

await a.getByText('France', { exact: false }).first().click()
await a.waitForTimeout(400)

// (5) checklist completion + (12) private confirmation document + (9) visual board
await a.goto(BASE + '/pack', { waitUntil: 'networkidle' })
await a.waitForTimeout(400)
await a.getByRole('button', { name: /^checklist$/i }).click()
await a.waitForTimeout(300)
await a.getByText('Sleepwear').first().click()
await a.waitForTimeout(200)
await a.getByText('Walking shoes').first().click()
await a.waitForTimeout(300)

// Seed IndexedDB directly for the two blob stores (private doc + board image)
await a.evaluate(async () => {
  const open = (name, store) => new Promise((res, rej) => {
    const r = indexedDB.open(name, 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store) }
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
  const put = (db, store, key, val) => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key)
    tx.oncomplete = res; tx.onerror = rej
  })
  const docDb = await open('trip-os-private-docs', 'docs')
  await put(docDb, 'docs', 'louvre-ticket', {
    blob: new Blob(['LOUVRE-CONFIRMATION-PDF-BYTES'], { type: 'application/pdf' }),
    type: 'application/pdf', name: 'louvre.pdf', savedAt: Date.now(),
  })
  const imgDb = await open('trip-os-visual-boards', 'boards')
  await put(imgDb, 'boards', 'visual-test-img', {
    blob: new Blob(['FAKE-JPEG-BYTES'], { type: 'image/jpeg' }),
    type: 'image/jpeg', name: 'scarf.jpg', savedAt: Date.now(),
  })
})

// (7) wardrobe override, (6) custom checklist item, (10) custom itinerary item,
// (9) visual board metadata — write through the real persisted store shape.
await a.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('trip-os-app-state'))
  raw.state.wardrobeItemOverrides = { 'france-2026:c1': { name: 'RENAMED SCARF' } }
  raw.state.customChecklistItems = [{ id: 'chk-custom-qa', tripId: 'france-2026', category: 'Clothing', label: 'QA CUSTOM ITEM' }]
  raw.state.manualItems = [{ id: 'manual-qa', tripId: 'france-2026', kind: 'activity', title: 'QA MANUAL ITEM', date: '2026-09-27' }]
  raw.state.visualBoards = [{ id: 'visual-test', tripId: 'france-2026', type: 'outfit', title: 'QA BOARD', imageKey: 'visual-test-img', createdAt: Date.now() }]
  raw.state.resolvedOpenItemIds = { 'france-2026:open-esim': true }
  localStorage.setItem('trip-os-app-state', JSON.stringify(raw))
})
await a.reload({ waitUntil: 'networkidle' })
await a.waitForTimeout(500)

const stateA = await a.evaluate(() => JSON.parse(localStorage.getItem('trip-os-app-state')).state)
check('A: checklist completions recorded', Object.keys(stateA.packedItems || {}).length === 2,
  `${Object.keys(stateA.packedItems || {}).length} checked`)

// Export the backup (the panel lives on the trips home)
await a.goto(BASE + '/', { waitUntil: 'networkidle' })
await a.waitForTimeout(500)
const downloadPromise = a.waitForEvent('download', { timeout: 15000 })
await a.getByRole('button', { name: /^export$/i }).click()
const download = await downloadPromise
const backupPath = '/tmp/qa-backup.json'
await download.saveAs(backupPath)
check('A: backup file downloaded', true, download.suggestedFilename())

const fs = await import('fs')
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
check('backup has correct format marker', backup.format === 'trip-os-backup' && backup.version === 1)
check('backup carries app state', Boolean(backup.appState?.state?.packedItems))
check('backup carries private documents (blob layer 1)', backup.privateDocs.length === 1,
  `${backup.privateDocs.length} doc(s)`)
check('backup carries visual board images (blob layer 2)', backup.visualBoardImages.length === 1,
  `${backup.visualBoardImages.length} image(s)`)
check('backup doc has non-empty base64 payload', (backup.privateDocs[0]?.data?.length ?? 0) > 0)

await ctxA.close()

// ---------- Container B: "installed Home Screen app" — separate storage ----------
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } })
const b = await ctxB.newPage()
await b.goto(BASE + '/', { waitUntil: 'networkidle' })
await b.waitForTimeout(500)

const emptyState = await b.evaluate(() => localStorage.getItem('trip-os-app-state'))
check('B: starts with genuinely empty storage (models the iOS partition)', emptyState === null)

const warningVisible = await b.getByText(/No saved trip data on this device/i).count()
check('B: surfaces "no saved data" warning instead of looking normal', warningVisible === 1)

// Restore
await b.setInputFiles('input[type=file]', backupPath)
await b.waitForTimeout(2500)
const restoreMsg = await b.getByText(/Restored/i).first().textContent().catch(() => '')
check('B: restore reports success', /Restored/.test(restoreMsg || ''), (restoreMsg || '').trim().slice(0, 90))

await b.reload({ waitUntil: 'networkidle' })
await b.waitForTimeout(600)

const stateB = await b.evaluate(() => JSON.parse(localStorage.getItem('trip-os-app-state') || '{}').state || {})
check('B: checklist completion restored', Object.keys(stateB.packedItems || {}).length === 2,
  `${Object.keys(stateB.packedItems || {}).length} checked`)
check('B: custom checklist item restored', (stateB.customChecklistItems || []).some(i => i.label === 'QA CUSTOM ITEM'))
check('B: wardrobe override restored', stateB.wardrobeItemOverrides?.['france-2026:c1']?.name === 'RENAMED SCARF')
check('B: custom itinerary item restored', (stateB.manualItems || []).some(i => i.title === 'QA MANUAL ITEM'))
check('B: visual board metadata restored', (stateB.visualBoards || []).some(v => v.title === 'QA BOARD'))
check('B: resolved open item restored', stateB.resolvedOpenItemIds?.['france-2026:open-esim'] === true)

// The critical one: blobs actually landed in IndexedDB, so the metadata
// isn't pointing at nothing.
const blobs = await b.evaluate(async () => {
  const read = (name, store, key) => new Promise((res) => {
    const r = indexedDB.open(name, 1)
    r.onsuccess = () => {
      const db = r.result
      if (!db.objectStoreNames.contains(store)) return res(null)
      const rq = db.transaction(store, 'readonly').objectStore(store).get(key)
      rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null)
    }
    r.onerror = () => res(null)
  })
  const doc = await read('trip-os-private-docs', 'docs', 'louvre-ticket')
  const img = await read('trip-os-visual-boards', 'boards', 'visual-test-img')
  return {
    docSize: doc?.blob?.size ?? 0, docType: doc?.type ?? null, docName: doc?.name ?? null,
    docText: doc ? await doc.blob.text() : null,
    imgSize: img?.blob?.size ?? 0, imgType: img?.type ?? null,
  }
})
check('B: private document blob restored to IndexedDB', blobs.docSize > 0,
  `${blobs.docSize} bytes, ${blobs.docType}, ${blobs.docName}`)
check('B: private document bytes are byte-identical', blobs.docText === 'LOUVRE-CONFIRMATION-PDF-BYTES')
check('B: visual board image blob restored to IndexedDB', blobs.imgSize > 0,
  `${blobs.imgSize} bytes, ${blobs.imgType}`)

// Checklist state actually visible in the UI
await b.goto(BASE + '/pack', { waitUntil: 'networkidle' })
await b.waitForTimeout(400)
await b.getByRole('button', { name: /^checklist$/i }).click()
await b.waitForTimeout(400)
// 3, not 2: the two manually-checked items plus chk-res-louvre, which
// auto-satisfies because the restored louvre-ticket document is now on
// this device. 54, not 53: the restored custom item. Both prove the
// restore reconnected the metadata to the blob layer.
const progress = await b.locator('text=/Ready ·/').first().innerText()
check('B: checklist progress reflects restore + linked confirmation', /· 3 of 54/.test(progress), progress)
const customVisible = await b.getByText('QA CUSTOM ITEM').count()
check('B: custom checklist item visible in UI', customVisible > 0)

// Non-destructive guarantee: re-importing must not duplicate or clobber
await b.goto(BASE + '/', { waitUntil: 'networkidle' })
await b.waitForTimeout(400)
await b.setInputFiles('input[type=file]', backupPath)
await b.waitForTimeout(2500)
const stateB2 = await b.evaluate(() => JSON.parse(localStorage.getItem('trip-os-app-state') || '{}').state || {})
check('B: re-import does not duplicate manual items',
  (stateB2.manualItems || []).filter(i => i.title === 'QA MANUAL ITEM').length === 1)
check('B: re-import does not duplicate custom checklist items',
  (stateB2.customChecklistItems || []).filter(i => i.label === 'QA CUSTOM ITEM').length === 1)

await ctxB.close()
await browser.close()

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILURES:'); failed.forEach(f => console.log('  - ' + f.name)); process.exit(1) }
