export async function readItineraryFile(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a file smaller than 15 MB.')
  if (/\.txt$/i.test(file.name)) return file.text()
  if (!/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF or plain text file.')
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 50) throw new Error('Import at most 50 pages at a time.')
    const pages: string[] = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      let text = '', previousY: number | undefined
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (previousY !== undefined && Math.abs(y - previousY) > 4) text += '\n'
        text += item.str + (item.hasEOL ? '\n' : ' ')
        previousY = y
      }
      pages.push(text)
    }
    const text = pages.join('\n')
    if (text.trim().length < 30) throw new Error('This PDF has no readable text. Paste the itinerary text instead; scanned PDFs are not supported yet.')
    return text
  } finally { await task.destroy() }
}
