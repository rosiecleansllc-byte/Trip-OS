import { NavLink } from 'react-router-dom'
import { CalendarDays, Home, Luggage, Map, PlaneTakeoff, Wallet } from 'lucide-react'
import { clsx } from 'clsx'

const TABS = [
  { to: '/today', label: 'Today', icon: Home },
  { to: '/trip', label: 'Trip', icon: Map },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/transport', label: 'Transport', icon: PlaneTakeoff },
  { to: '/pack', label: 'Pack', icon: Luggage },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10.5px] font-medium transition-colors',
                isActive ? 'text-blue' : 'text-gray'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
