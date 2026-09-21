// QA: standalone/PWA launch behavior + no regressions in normal mode.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pkg

const BASE = 'http://localhost:5186'
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

// ---- Standalone launch: route restoration ----
// display-mode:standalone can't be forced in Chromium headless, so drive
// the same code path via the iOS signal (navigator.standalone), which is
// exactly what an iPhone Home Screen app reports.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
await ctx.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }) })
const page = await ctx.newPage()

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
check('standalone: cold start with no history lands on trips list', new URL(page.url()).pathname === '/',
  new URL(page.url()).pathname)

await page.getByText('France', { exact: false }).first().click()
await page.waitForTimeout(400)
await page.goto(BASE + '/bookings', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const saved = await page.evaluate(() => localStorage.getItem('trip-os-last-route'))
check('standalone: last route remembered', saved === '/bookings', String(saved))

// Relaunch from start_url, as the Home Screen app always does
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
check('standalone: relaunch reopens where she left off',
  new URL(page.url()).pathname === '/bookings', new URL(page.url()).pathname)
await ctx.close()

// ---- Browser tab (not standalone): must NOT hijack the trips list ----
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page2 = await ctx2.newPage()
await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
await page2.waitForTimeout(300)
await page2.getByText('France', { exact: false }).first().click()
await page2.waitForTimeout(300)
await page2.goto(BASE + '/pack', { waitUntil: 'networkidle' })
await page2.waitForTimeout(600)
await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
await page2.waitForTimeout(900)
check('browser tab: "/" stays on the trips list (no redirect hijack)',
  new URL(page2.url()).pathname === '/', new URL(page2.url()).pathname)

// ---- Normal-mode regression sweep across every page ----
const errors = []
page2.on('pageerror', (e) => errors.push(String(e)))
for (const path of ['/overview', '/today', '/trip', '/bookings', '/transport', '/pack', '/wallet']) {
  await page2.goto(BASE + path, { waitUntil: 'networkidle' })
  await page2.waitForTimeout(500)
  const text = await page2.evaluate(() => document.body.innerText)
  check(`normal: ${path} renders content`, text.length > 200, `${text.length} chars`)
}
check('normal: no uncaught page errors across all routes', errors.length === 0, errors.slice(0, 2).join(' | '))

// Austin regression — the other trip must be untouched
await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
await page2.waitForTimeout(400)
await page2.getByText('Austin', { exact: false }).first().click()
await page2.waitForTimeout(400)
await page2.goto(BASE + '/pack', { waitUntil: 'networkidle' })
await page2.waitForTimeout(400)
await page2.getByRole('button', { name: /^checklist$/i }).click()
await page2.waitForTimeout(400)
const austin = await page2.locator('text=/Ready ·/').first().innerText()
check('normal: Austin checklist intact (19 items)', /of 19/.test(austin), austin)

await browser.close()
const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILURES:'); failed.forEach(f => console.log('  - ' + f.name + (f.detail ? ' — ' + f.detail : ''))); process.exit(1) }
