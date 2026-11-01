// Files are opt-in per link; private document keys never leave this device.
export interface SharedConfirmation { id: string; title: string; date: string; name: string; type: string }
export interface ConfirmationUpload { title: string; date: string; name: string; type: string; base64: string }
export const MAX_CONFIRMATION_BYTES = 2 * 1024 * 1024
export const MAX_CONFIRMATIONS_TOTAL_BYTES = 3 * 1024 * 1024
export const MAX_CONFIRMATIONS = 10
export const CONFIRMATION_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
export function confirmationUrl(shareId: string, documentId: string) {
  return `/.netlify/functions/trip-share?id=${encodeURIComponent(shareId)}&document=${encodeURIComponent(documentId)}`
}
