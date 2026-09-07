import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { getTrip } from './data/tripsIndex'
import { useAppStore } from './store/useAppStore'
import { Today } from './pages/Today'
import { TripPage } from './pages/Trip'
import { Bookings } from './pages/Bookings'
import { Transport } from './pages/Transport'
import { Pack } from './pages/Pack'
import { WalletPage } from './pages/Wallet'

function App() {
  const currentTripId = useAppStore((s) => s.currentTripId)
  const trip = getTrip(currentTripId)

  if (!trip) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ivory p-6 text-center text-ink-soft">
        No trip found. Add one in src/data/trips and register it in tripsIndex.ts.
      </div>
    )
  }

  return (
    <AppShell meta={trip.meta}>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today trip={trip} />} />
        <Route path="/trip" element={<TripPage trip={trip} />} />
        <Route path="/bookings" element={<Bookings trip={trip} />} />
        <Route path="/transport" element={<Transport trip={trip} />} />
        <Route path="/pack" element={<Pack trip={trip} />} />
        <Route path="/wallet" element={<WalletPage trip={trip} />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
