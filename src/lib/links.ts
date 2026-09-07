export function directionsUrl(place?: string): string | undefined {
  if (!place) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
}

export function telUrl(phone?: string): string | undefined {
  if (!phone) return undefined
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
