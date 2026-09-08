import { Bell } from 'lucide-react'
import { useAlertCenterUiStore } from '../../store/useAlertCenterUiStore'

// Badge only appears when there's something actionable — an empty bell
// never draws a dot, so it stays quiet on a fully caught-up trip.
export function AlertBell({ count }: { count: number }) {
  const openPanel = useAlertCenterUiStore((s) => s.openPanel)
  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label={count > 0 ? `Trip alerts, ${count} need attention` : 'Trip alerts'}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-blue/40"
    >
      <Bell size={15} />
      {count > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red" />}
    </button>
  )
}
