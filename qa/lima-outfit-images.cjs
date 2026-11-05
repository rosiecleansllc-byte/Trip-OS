// Public flats must resolve for every supported Lima outfit item.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { peruTrip } = require('../src/data/trips/peru-2026.ts')
const paths = new Set()
for (const board of peruTrip.outfitBoards) {
  for (const name of board.itemNames) {
    // The necklace still uses the traveler's own uploaded reference.
    if (name === 'Translucent necklace') continue
    const url = board.itemImageUrls?.[name]
    assert.ok(url, `${name}: missing link in ${board.label}`)
    assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', 'public', url)), url)
    paths.add(url)
  }
}
assert.equal(paths.size, 26)
console.log('PASS: all 26 Lima garment flats resolve across all 12 days')
