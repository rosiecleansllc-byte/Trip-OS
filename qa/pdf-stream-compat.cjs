require('./ocr-extraction.cjs')
const assert = require('node:assert/strict')
const {readPdfPageText} = require('../src/lib/pdfPageText.ts')
;(async () => {
  const stream = new ReadableStream({start(controller) {
    controller.enqueue({items:[{str:'NOV 9, 2026',transform:[1,0,0,1,0,100],hasEOL:true}]})
    controller.enqueue({items:[{str:'ACTIVITIES',transform:[1,0,0,1,0,80],hasEOL:true},{str:'Sample tour',transform:[1,0,0,1,0,60],hasEOL:true}]})
    controller.close()
  }})
  Object.defineProperty(stream, Symbol.asyncIterator, {value:undefined})
  await assert.rejects(async () => { for await (const chunk of stream) void chunk }, TypeError)
  const text = await readPdfPageText({streamTextContent:()=>stream})
  const rows = require('../src/lib/itineraryImport.ts').parseItinerary(text,'2026-11-05')
  assert.equal(rows[0].title,'Sample tour');assert.equal(rows[0].date,'2026-11-09');assert.equal(stream.locked,false)
  if (process.argv[2]) {
    const fs = require('node:fs')
    const canvas = require('@napi-rs/canvas')
    Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D})
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const original = Object.getOwnPropertyDescriptor(ReadableStream.prototype,Symbol.asyncIterator)
    delete ReadableStream.prototype[Symbol.asyncIterator]
    const task = pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))})
    try {
      const pdf = await task.promise
      await assert.rejects(() => pdf.getPage(1).then(page=>page.getTextContent()), TypeError)
      let pages=[]
      for(let p=1;p<=pdf.numPages;p++) pages.push(await readPdfPageText(await pdf.getPage(p)))
      const imported = require('../src/lib/itineraryImport.ts').parseItinerary(pages.join('\n'),'2026-11-05')
      assert.equal(imported.length,55)
      console.log('PASS: actual 10-page PDF, original API fails without async iteration, replacement extracts 55 entries')
    } finally { await task.destroy(); if(original)Object.defineProperty(ReadableStream.prototype,Symbol.asyncIterator,original) }
  }
  console.log('PASS: PDF stream compatibility without async iterator, date parsing and reader cleanup')
})().catch(error=>{console.error(error);process.exitCode=1})
