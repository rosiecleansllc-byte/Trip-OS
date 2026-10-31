// ReadableStream.getReader works on Safari versions that do not expose
// ReadableStream[Symbol.asyncIterator]. PDF.js getTextContent uses for-await.
export async function readPdfPageText(page: { streamTextContent(): ReadableStream<{ items: unknown[] }> }): Promise<string> {
  const reader = page.streamTextContent().getReader()
  let text = '', previousY: number | undefined
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      for (const raw of value.items) {
        if (!raw || typeof raw !== 'object' || !('str' in raw) || !('transform' in raw)) continue
        const item = raw as { str: string; transform: number[]; hasEOL?: boolean }
        const y = item.transform[5]
        if (previousY !== undefined && Math.abs(y - previousY) > 4) text += '\n'
        text += item.str + (item.hasEOL ? '\n' : ' ')
        previousY = y
      }
    }
    return text
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally { reader.releaseLock() }
}
