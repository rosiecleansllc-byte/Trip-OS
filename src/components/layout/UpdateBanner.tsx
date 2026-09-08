import { useRegisterSW } from 'virtual:pwa-register/react'

// A new service worker installs in the background and waits — it never
// takes over and silently reloads the app while a traveler is mid-
// itinerary (see vite.config.ts's registerType: 'prompt'). This is the
// one explicit control that activates it, on tap only.
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white shadow-lg"
      >
        Trip OS update available · Refresh
      </button>
    </div>
  )
}
