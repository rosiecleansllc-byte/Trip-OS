import { Plus } from 'lucide-react'
import { useManualItemUiStore } from '../../store/useManualItemUiStore'

// The global "+" entry point into the manual add/edit sheet — mounted
// once in AppShell, so it's reachable from every trip tab. Floats above
// BottomNav rather than living in TopBar so it stays a thumb-reachable
// primary action on a tall phone screen.
export function AddItemFab() {
  const openPicker = useManualItemUiStore((s) => s.openPicker)

  return (
    <button
      type="button"
      onClick={openPicker}
      aria-label="Add to trip"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-white shadow-lg transition-transform active:scale-95"
      style={{ right: 'max(1rem, calc((100vw - 28rem) / 2 + 1rem))' }}
    >
      <Plus size={24} />
    </button>
  )
}
