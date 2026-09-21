// QA: home-readiness alert fires as departure nears, escalates to a real
// "alarm" (critical/now, which triggers the browser Notification bridge)
// on departure day, clears once tasks are checked, and never appears for
// a trip with no homeTask items (Austin) or outside the window.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pkg

const BASE = 'http://localhost:5187'
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

// Freezes Date to a fixed instant for every page/context created from
// this browser — the mock month is 0-indexed (JS Date convention).
function mockDateScript(y, m, d, h = 9) {
  return `(() => {
    const fixed = new Date(${y}, ${m}, ${d}, ${h}, 0, 0).getTime()
    const RealDate = Date
    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) return new RealDate(fixed)
        return new RealDate(...args)
      }
      static now() { return fixed }
    }
    window.Date = MockDate
  })()`
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

async function alertBodyText(page) {
  await page.goto(BASE + '/today', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  return page.evaluate(() => document.body.innerText)
}

async function openAlertCenter(page) {
  await page.getByRole('button', { name: /trip alerts/i }).first().click()
  await page.waitForTimeout(400)
  return page.evaluate(() => document.body.innerText)
}

// ---- 5 days out (today, real date): no home-readiness alert ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByText('France', { exact: false }).first().click()
  await page.waitForTimeout(400)
  const text = await alertBodyText(page)
  check('5 days out: no home-readiness alert on Today', !/home task/i.test(text) && !/Before you leave/i.test(text))
  await ctx.close()
}

// ---- 1 day before departure (Sept 25, still pre-trip phase) ----
// Today's own pre-trip dashboard renders no alert banner at all (only
// the active-day view does) — so the Alert Center is the real surface
// to check here, plus the bell badge.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(mockDateScript(2026, 8, 25)) // month 8 = September
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByText('France', { exact: false }).first().click()
  await page.waitForTimeout(400)
  await page.goto(BASE + '/today', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const bellLabel = await page.getByRole('button', { name: /trip alerts/i }).first().getAttribute('aria-label')
  check('1 day out: bell badge reflects the alert', /need attention/i.test(bellLabel || ''), bellLabel || '')

  const centerText = await openAlertCenter(page)
  check('1 day out: alert appears (3 items, none checked)',
    /3 home tasks still undone/i.test(centerText), centerText.match(/\d+ home tasks[^\n]*/)?.[0])
  // Group headers render through an uppercase CSS transform, so innerText
  // reads "UPCOMING"/"NOW", not the DOM's actual "Upcoming"/"Now" string.
  check('1 day out: alert lives in Upcoming (not Now — not yet the alarm tier)',
    /UPCOMING[\s\S]{0,400}home tasks still undone/.test(centerText) && !/^NOW[\s\S]{0,400}home tasks still undone/m.test(centerText))
  await ctx.close()
}

// ---- Departure day (Sept 26): critical/now — the actual "alarm" ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(mockDateScript(2026, 8, 26))
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByText('France', { exact: false }).first().click()
  await page.waitForTimeout(400)

  const todayText = await alertBodyText(page)
  check('departure day: home-readiness alert still shows', /3 home tasks still undone/i.test(todayText))
  await page.screenshot({ path: '/tmp/qa-home-alert-banner.png' })

  const centerText = await openAlertCenter(page)
  check('departure day: alert escalated to Now group (the alarm tier)', /Now[\s\S]{0,200}home tasks still undone/i.test(centerText))
  await page.screenshot({ path: '/tmp/qa-home-alert-center.png' })

  // Check off two of the three home tasks via the real UI, leave one.
  await page.goto(BASE + '/pack', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^checklist$/i }).click()
  await page.waitForTimeout(400)
  await page.getByText('Secure home', { exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByText('Handle trash/perishables', { exact: true }).click()
  await page.waitForTimeout(300)

  const afterTwoChecked = await alertBodyText(page)
  check('after checking 2 of 3: alert narrows to the one remaining task, named directly',
    /Before you leave: Mail\/package plan/i.test(afterTwoChecked),
    afterTwoChecked.match(/Before you leave:[^\n]*/)?.[0])

  // Check the last one — alert must disappear entirely.
  await page.goto(BASE + '/pack', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^checklist$/i }).click()
  await page.waitForTimeout(400)
  await page.getByText('Mail/package plan', { exact: true }).click()
  await page.waitForTimeout(300)

  const afterAllChecked = await alertBodyText(page)
  check('all 3 checked: home-readiness alert gone', !/home task/i.test(afterAllChecked) && !/Before you leave/i.test(afterAllChecked))

  // Share mode: home-readiness is not private, should still show (it's
  // not a document/confirmation, just a readiness reminder) — but should
  // not appear once resolved either. Re-verify visibility with tasks
  // undone in a fresh context instead (share mode + undone tasks).
  await ctx.close()
}

// ---- Departure day, undone tasks, Share mode: still visible (not isPrivate) ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(mockDateScript(2026, 8, 26))
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByText('France', { exact: false }).first().click()
  await page.waitForTimeout(400)
  await page.goto(BASE + '/today', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /share/i }).first().click()
  await page.waitForTimeout(500)
  const shareText = await page.evaluate(() => document.body.innerText)
  check('Share mode: home-readiness alert still visible (not private info)', /3 home tasks still undone/i.test(shareText))
  await ctx.close()
}

// ---- Austin: never produces a home-readiness alert (no homeTask items) ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(mockDateScript(2026, 8, 8)) // Austin starts Sept 9 2026 -> 1 day out
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByText('Austin', { exact: false }).first().click()
  await page.waitForTimeout(400)
  const text = await alertBodyText(page)
  check('Austin (no homeTask items): never shows a home-readiness alert', !/home task/i.test(text))
  await ctx.close()
}

await browser.close()
const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILURES:'); failed.forEach(f => console.log('  - ' + f.name + (f.detail ? ' — ' + f.detail : ''))); process.exit(1) }
