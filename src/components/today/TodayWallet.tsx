import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '../ui/SectionHeader'
import { WalletDocCard } from '../wallet/WalletDocCard'
import type { WalletDocEntry } from '../../lib/walletDocs'

// The compact "documents you'll actually need today" section on Today's
// active-day view — a subset of the same WalletDocEntry list the full
// Wallet page renders (see lib/walletDocs.ts), filtered to today's date
// and already in itinerary order, so a traveler never has to leave
// Today just to pull up the next QR code. Renders nothing at all when
// there's nothing to show, per spec — no empty oversized section.
export function TodayWallet({ entries }: { entries: WalletDocEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div>
      <SectionHeader eyebrow={`${entries.length} item${entries.length === 1 ? '' : 's'}`} title="Today's documents" action={<Wallet size={16} className="text-blue" />} />
      <div className="space-y-2">
        {entries.map((e) => (
          <WalletDocCard key={e.id} entry={e} variant="compact" />
        ))}
      </div>
      <Link to="/wallet" className="mt-2 inline-block text-xs font-medium text-blue">
        Full Wallet →
      </Link>
    </div>
  )
}
