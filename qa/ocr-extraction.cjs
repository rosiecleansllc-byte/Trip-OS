const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { parseFieldsForType } = require('../src/lib/ocrParse.ts')
// Synthetic confirmation with the screenshot's interleaved calendar/title layout.
const text = `& viator.com Mee
viator =
a Tripadvisor company
Search for a place or activity
You're in for a great trip, Traveler!
We've sent confirmation to your email.
NOV
Confirmed
09
Premium Paracas & Huacachina
2026
Day Trip from Lima with Sunset
Toast
Premium Day Trip (Standard) 05:30
Order Total: $187.20 $93.60 x 2 Adults
Booking reference: BR-1234567890
Get ticket in the app
Manage booking
Cha-ching! You've earned $9.36 Viator
Rewards
Available from Nov 10, 2026`
const parsed = parseFieldsForType('activity', text, '2026-11-05')
assert.equal(parsed.title, 'Premium Paracas & Huacachina Day Trip from Lima with Sunset Toast')
assert.equal(parsed.date, '2026-11-09')
assert.equal(parsed.time, '05:30')
assert.equal(parsed.endTime, undefined)
assert.equal(parsed.location, undefined)
assert.equal(parsed.cost, '187.20')
assert.equal(parsed.currency, 'USD')
assert.equal(parsed.partySize, '2')
assert.equal(parsed.confirmationCode, 'BR-1234567890')
assert.equal(parsed.status, 'confirmed') // confirmed alone doesn't prove payment
const stay = parseFieldsForType('stay', 'Hotel: Sample Hotel\nCheck-in: Nov 6, 2026 3:00 PM\nCheck-out: Nov 8, 2026\nGrand Total: $354.00', '2026-11-05')
assert.equal(stay.title, 'Sample Hotel'); assert.equal(stay.date, '2026-11-06'); assert.equal(stay.time, '15:00'); assert.equal(stay.endDate, '2026-11-08'); assert.equal(stay.cost, '354.00')
const activity = parseFieldsForType('activity', 'Event: Art evening\nVenue: City Gallery\nNovember 9, 2026\n18:00 20:00\n2 tickets', '2026-11-05')
assert.equal(activity.location, 'City Gallery'); assert.equal(activity.endTime, '20:00')
console.log('PASS: screenshot layout, booking date over rewards date, wrapped title, adult count, total, reference, conservative venue/payment, stay and event regressions')
