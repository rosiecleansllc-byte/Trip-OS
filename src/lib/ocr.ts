// Client-side OCR for the manual-item "Upload confirmation" flow. The
// tesseract.js engine and its worker/wasm-core/language-model assets are
// bundled locally under public/ocr/ (see that folder for what's there and
// why) instead of the library's CDN default, so recognizing a screenshot
// never makes any network request at all — the image and the extracted
// text both stay entirely on-device. `tesseract.js` itself is imported
// dynamically here so it (and its small JS glue code) only ever loads
// into the bundle when a traveler actually uses this feature, not on
// every app load.

export interface OcrProgress {
  status: string
  progress: number // 0..1
}

export interface OcrResult {
  text: string
  confidence: number // 0..100, Tesseract's own mean-confidence for the page
}

// Below this mean confidence, Tesseract "succeeded" (no exception) but
// the text it produced is generally noise — a few stray characters from
// JPEG artifacts, a busy background, or (as in the unreadable-image case)
// no real text at all. Treating that as a real read would mean showing
// the traveler fabricated-looking field values pulled from garbage, which
// is worse than just saying the read failed. Callers should treat a
// result below this threshold the same as a thrown error.
export const OCR_MIN_CONFIDENCE = 45

export async function recognizeImage(
  image: File | Blob,
  onProgress?: (p: OcrProgress) => void
): Promise<OcrResult> {
  const { createWorker, OEM } = await import('tesseract.js')
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/core/tesseract-core-simd-lstm.wasm.js',
    langPath: '/ocr/lang',
    gzip: true,
    logger: (m) => {
      if (m && typeof m.progress === 'number') onProgress?.({ status: m.status, progress: m.progress })
    },
  })
  try {
    const { data } = await worker.recognize(image)
    return { text: data.text, confidence: data.confidence }
  } finally {
    await worker.terminate()
  }
}
