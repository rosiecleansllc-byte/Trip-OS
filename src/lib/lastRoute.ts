import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const LAST_ROUTE_KEY = 'trip-os-last-route'

// Routes worth reopening. '/' is the trips list, which is where a cold
// launch should land anyway, so it's never stored as a destination.
const RESTORABLE = ['/overview', '/today', '/trip', '/bookings', '/transport', '/pack', '/wallet']

function isStandalone(): boolean {
  // iOS uses the non-standard navigator.standalone; everything else
  // reports the display-mode media query.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

// The Home Screen app always cold-starts at the manifest's start_url, so
// without this it reopens on the trips list every time — part of why an
// installed copy feels like a different, emptier app than the Safari tab
// it was installed from. Remembering the last screen (and only restoring
// it when actually launched standalone, from the start_url, once per
// launch) makes it reopen where she left off.
export function useRouteRestoration() {
  const location = useLocation()
  const navigate = useNavigate()
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    if (!isStandalone() || location.pathname !== '/') return
    try {
      const saved = localStorage.getItem(LAST_ROUTE_KEY)
      if (saved && RESTORABLE.includes(saved)) navigate(saved, { replace: true })
    } catch {
      // Private mode or blocked storage — cold-start on the trips list.
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!RESTORABLE.includes(location.pathname)) return
    try {
      localStorage.setItem(LAST_ROUTE_KEY, location.pathname)
    } catch {
      // Nothing to restore later; not worth surfacing.
    }
  }, [location.pathname])
}
