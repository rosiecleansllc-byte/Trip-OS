const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
const memory = new Map()
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
Object.defineProperty(global, 'localStorage', { configurable: true, value: storage })
global.window = { localStorage: storage }
const key = 'trip-os-app-state'
const ids = ['peru-transfers', 'peru-plans']
// Start from the actual previous persisted version, including reopened values.
memory.set(key, JSON.stringify({ version: 4, state: { currentTripId: 'peru-2026', manualItems: [], resolvedOpenItemIds: { 'peru-2026:peru-transfers': false, 'peru-2026:peru-plans': false, 'other:standalone': true }, packedItems: { 'peru-2026:test': true } } }))
const loadStore = () => {
  delete require.cache[require.resolve('../src/store/useAppStore.ts')]
  return require('../src/store/useAppStore.ts').useAppStore
}
const { peruTrip } = require('../src/data/trips/peru-2026.ts')
const { getEffectiveTrip, findOpenItemsToUnresolve } = require('../src/lib/manualItems.ts')
const { computeReadiness } = require('../src/lib/readiness.ts')
let store = loadStore()
function assertCompleted() {
  const state = store.getState()
  for (const id of ids) {
    assert.equal(state.resolvedOpenItemIds[`peru-2026:${id}`], true)
    assert.equal(state.manuallyCompletedOpenItemIds[`peru-2026:${id}`], true)
  }
  const effective = getEffectiveTrip(peruTrip, state.manualItems, state.resolvedOpenItemIds)
  assert.equal(effective.openItems.filter(item => ids.includes(item.id) && item.status === 'done').length, 2)
  assert(!computeReadiness(effective).openItems.some(item => ids.includes(item.id)))
  assert.deepEqual(findOpenItemsToUnresolve(peruTrip, [], state.resolvedOpenItemIds, state.manuallyCompletedOpenItemIds), [])
}
assertCompleted()
assert.equal(store.getState().packedItems['peru-2026:test'], true)
assert.equal(store.getState().manuallyCompletedOpenItemIds['other:standalone'], true)
assert.equal(JSON.parse(memory.get(key)).version, 5)
for (let refresh = 0; refresh < 3; refresh++) { store = loadStore(); assertCompleted() }
// Explicit new checkoffs survive a full store reload and unrelated edits.
store.getState().resolveOpenItem('peru-2026', 'test-independent', true)
store = loadStore()
const independentTrip = { ...peruTrip, openItems: [{ id: 'test-independent', tripId: 'peru-2026', label: 'Independent', category: 'other', status: 'open' }] }
assert.deepEqual(findOpenItemsToUnresolve(independentTrip, [], store.getState().resolvedOpenItemIds, store.getState().manuallyCompletedOpenItemIds), [])
// Booking-linked resolution still reopens when its supporting booking is gone.
store.getState().resolveOpenItem('peru-2026', 'test-linked')
const linkedTrip = { ...peruTrip, openItems: [{ id: 'test-linked', tripId: 'peru-2026', label: 'Transfer', category: 'transport', status: 'open' }] }
assert.deepEqual(findOpenItemsToUnresolve(linkedTrip, [], store.getState().resolvedOpenItemIds, store.getState().manuallyCompletedOpenItemIds), ['test-linked'])
// Deliberately reopening a migrated task persists; migration never rechecks it.
store.getState().unresolveOpenItem('peru-2026', 'peru-plans')
store = loadStore()
assert.equal(store.getState().resolvedOpenItemIds['peru-2026:peru-plans'], false)
assert.equal(store.getState().manuallyCompletedOpenItemIds['peru-2026:peru-plans'], false)
store.getState().resolveOpenItem('peru-2026', 'peru-plans', true)
store = loadStore(); assertCompleted()
console.log('PASS: Peru tasks completed by one-time upgrade; real storage reloads preserve checkoffs; manual completions survive unrelated booking edits; linked suggestions still reopen; explicit reopening persists; existing data preserved')
