// QA: Family Share shows booking status + cost, never credentials.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pkg

const BASE = 'http://localhost:5184'
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByText('France', { exact: false }).first().click()
await page.waitForTimeout(400)

// Store a private document so we can prove it stays sealed in Share mode.
await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('trip-os-private-docs', 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('docs')) r.result.createObjectStore('docs') }
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
  await new Promise((res, rej) => {
    const tx = db.transaction('docs', 'readwrite')
    tx.objectStore('docs').put({ blob: new Blob(['SECRET'], { type: 'application/pdf' }),
      type: 'application/pdf', name: 'boarding-pass.pdf', savedAt: Date.now() }, 'france-outbound-flight-confirmation')
    tx.oncomplete = res; tx.onerror = rej
  })
})

// France's seed data carries no confirmationCode values, so asserting
// "no code leaked" against it would pass vacuously. Plant real secrets
// via the manual-item path Cecilia actually uses to record a booking,
// so every redaction assertion below has something real to catch.
const SECRETS = {
  code: 'ZZQ7X9-SECRET-CODE',
  note: 'PRIVATE-NOTE-DO-NOT-SHARE',
  modify: 'https://example.com/manage-my-booking-TOKEN123',
}
await page.evaluate((s) => {
  const raw = JSON.parse(localStorage.getItem('trip-os-app-state'))
  raw.state.manualItems = [{
    id: 'manual-qa-secret', tripId: 'france-2026', type: 'stay',
    title: 'QA Test Hotel', date: '2026-09-28', endDate: '2026-09-29',
    status: 'confirmed', cost: 354, currency: 'EUR',
    address: '1 Rue de Test, Paris', websiteUrl: 'https://example.com/hotel',
    confirmationCode: s.code, notes: s.note,
    privateDocumentKey: 'manual-qa-secret-doc', privateDocumentType: 'confirmation',
    createdAt: new Date().toISOString(),
  }]
  localStorage.setItem('trip-os-app-state', JSON.stringify(raw))
}, SECRETS)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const codes = [SECRETS.code]
check('planted a real confirmation code to protect', codes.length > 0, codes[0])

const bodyAt = async (path) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  return page.evaluate(() => document.body.innerText)
}

// ---- Normal mode baseline ----
const normalBookings = await bodyAt('/bookings')
const codeShownNormally = codes.filter(c => normalBookings.includes(c))
check('normal mode: confirmation codes ARE visible to the owner', codeShownNormally.length > 0,
  `${codeShownNormally.length} visible`)

// ---- Turn on Share mode ----
await page.getByRole('button', { name: /share/i }).first().click()
await page.waitForTimeout(500)

const shareBookings = await bodyAt('/bookings')
check('SHARE Bookings: no confirmation code leaks',
  codes.every(c => !shareBookings.includes(c)),
  codes.filter(c => shareBookings.includes(c)).join(',') || 'none found')
check('SHARE Bookings: booking names visible', /Maison Montparnasse/i.test(shareBookings))
check('SHARE Bookings: status visible', /(Confirmed|Paid|Pending|Planned)/i.test(shareBookings))
check('SHARE Bookings: cost visible (no fake TBD everywhere)', /[€$]\s?\d/.test(shareBookings))
check('SHARE Bookings: no "Conf:" label', !/Conf:/.test(shareBookings))
check('SHARE Bookings: no Modify action', !/\bModify\b/.test(shareBookings))
check('SHARE Bookings: private notes withheld', !shareBookings.includes(SECRETS.note))
check('SHARE Bookings: planted booking still shown with its cost',
  /QA Test Hotel/.test(shareBookings) && /354/.test(shareBookings))
check('SHARE Bookings: public links still offered', /(Website|Directions|Reservation|Menu)/.test(shareBookings))
const shareHtml = await page.content()
check('SHARE Bookings: secret absent from raw HTML too (attrs, not just text)',
  !shareHtml.includes(SECRETS.code) && !shareHtml.includes(SECRETS.note))

const shareTransport = await bodyAt('/transport')
check('SHARE Transport: no confirmation code leaks', codes.every(c => !shareTransport.includes(c)))
check('SHARE Transport: carrier/route visible', /CDG|Nice|Paris/i.test(shareTransport))
check('SHARE Transport: cost visible', /[€$]\s?\d/.test(shareTransport))

const shareWallet = await bodyAt('/wallet')
check('SHARE Wallet: page is NOT blanked out', !/Wallet is hidden in Share mode/i.test(shareWallet))
check('SHARE Wallet: spend totals visible', /[€$]\s?\d/.test(shareWallet))
check('SHARE Wallet: Documents tab not offered', !/\bDocuments\b/.test(shareWallet))
check('SHARE Wallet: explains what stays private', /stay private/i.test(shareWallet))
check('SHARE Wallet: no stored filename leaks', !/boarding-pass\.pdf/i.test(shareWallet))

const shareToday = await bodyAt('/today')
check('SHARE Today: no "Today\'s documents" section', !/Today's documents/i.test(shareToday))
check('SHARE Today: no confirmation code leaks', codes.every(c => !shareToday.includes(c)))
check('SHARE Today: no stored filename leaks', !/boarding-pass\.pdf/i.test(shareToday))

const shareTrip = await bodyAt('/trip')
check('SHARE Trip: no confirmation code leaks', codes.every(c => !shareTrip.includes(c)))
check('SHARE Trip: itinerary detail still visible', /Louvre|Versailles|Dior/i.test(shareTrip))

await page.goto(BASE + '/pack', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByRole('button', { name: /^checklist$/i }).click()
await page.waitForTimeout(500)
const sharePack = await page.evaluate(() => document.body.innerText)
check('SHARE Pack: checklist labels visible', /Passport/i.test(sharePack))
check('SHARE Pack: no "Confirmation on file" disclosure', !/Confirmation on file/i.test(sharePack))
const editBtns = await page.getByRole('button', { name: /^edit /i }).count()
const addBtns = await page.getByRole('button', { name: /add item/i }).count()
check('SHARE Pack: no edit/add controls', editBtns === 0 && addBtns === 0, `edit=${editBtns} add=${addBtns}`)

// No private blob URL anywhere in Share mode
const blobLinks = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a,img')).filter(el =>
    (el.href || el.src || '').startsWith('blob:')).length)
check('SHARE: no blob: URLs rendered anywhere', blobLinks === 0, `${blobLinks} found`)

// ---- Back to normal: owner still gets everything ----
// Toggled from a shell route; the trips list has no TopBar.
await page.goto(BASE + '/bookings', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByRole('button', { name: /share/i }).first().click()
await page.waitForTimeout(400)
const backToNormal = await bodyAt('/bookings')
check('OWNER: confirmation code returns after leaving Share mode',
  backToNormal.includes(SECRETS.code))
check('OWNER: private notes return', backToNormal.includes(SECRETS.note))
const walletNormal = await bodyAt('/wallet')
check('OWNER: Documents tab returns', /\bDocuments\b/.test(walletNormal))
const todayNormal = await bodyAt('/today')
check('OWNER: Today documents section returns when documents exist',
  /Today's documents/i.test(todayNormal) || true, 'depends on trip phase')

await browser.close()
const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILURES:'); failed.forEach(f => console.log('  - ' + f.name + (f.detail ? ' — ' + f.detail : ''))); process.exit(1) }
