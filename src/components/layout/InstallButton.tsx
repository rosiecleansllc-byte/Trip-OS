import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

// Not part of any web standard type lib yet — the minimal shape Trip OS
// actually uses off the event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Only ever renders when the browser itself fired beforeinstallprompt
// (Chrome/Edge/Android — never iOS Safari, which has no such event and
// no programmatic install path at all). No custom install modal, no
// nagging: just a small optional action that appears if and only if a
// real install is actually available right now.
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!promptEvent) return null

  const handleInstall = async () => {
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-blue"
    >
      <Download size={13} />
      Install Trip OS
    </button>
  )
}
