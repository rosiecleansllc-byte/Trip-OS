import { useEffect, useState } from 'react'
import { CloudOff } from 'lucide-react'

// navigator.onLine plus the standard online/offline window events —
// setOnline only ever runs inside those event callbacks, never
// synchronously in the effect body.
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}

// Deliberately understated — not red, no icon-of-alarm — since offline
// is an expected, handled state for a trip app (see PWA offline
// caching), not an error. Clears itself automatically the moment
// connectivity returns.
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className="flex items-center justify-center gap-1.5 border-b border-line bg-bg-soft px-4 py-1.5 text-[11px] text-ink-soft">
      <CloudOff size={12} />
      Offline — saved trip info is available
    </div>
  )
}
