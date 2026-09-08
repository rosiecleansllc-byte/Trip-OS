import type { ReactNode } from 'react'
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
import { TripsHome } from './pages/TripsHome'
import { Overview } from './pages/Overview'

function App() {
  const currentTripId = useAppStore((s) => s.currentTripId)
  const trip = getTrip(currentTripId)

  const withShell = (node: ReactNode) => {
    if (!trip) return <Navigate to="/" replace />
    const pendingCount = trip.bookings.filter((b) => b.status === 'pending').length
    return (
      <AppShell trip={trip} pendingCount={pendingCount}>
        {node}
      </AppShell>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<TripsHome />} />
      <Route path="/overview" element={withShell(trip && <Overview trip={trip} />)} />
      <Route path="/today" element={withShell(trip && <Today trip={trip} />)} />
      <Route path="/trip" element={withShell(trip && <TripPage trip={trip} />)} />
      <Route path="/bookings" element={withShell(trip && <Bookings trip={trip} />)} />
      <Route path="/transport" element={withShell(trip && <Transport trip={trip} />)} />
      <Route path="/pack" element={withShell(trip && <Pack trip={trip} />)} />
      <Route path="/wallet" element={withShell(trip && <WalletPage trip={trip} />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
