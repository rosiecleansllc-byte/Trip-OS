import { CalendarCheck, Globe, Navigation, Phone, SquarePen, Ticket, UtensilsCrossed } from 'lucide-react'
import type { LinkActions } from '../../types/trip'
import { directionsUrl, telUrl } from '../../lib/links'

interface ActionRowProps extends LinkActions {
  location?: string
  shareMode?: boolean
  className?: string
}

export function ActionRow({
  location,
  websiteUrl,
  ticketUrl,
  reservationUrl,
  menuUrl,
  phone,
  privateTicketUrl,
  modifyUrl,
  shareMode = false,
  className = '',
}: ActionRowProps) {
  // Outside Share mode, prefer the traveler's actual purchased ticket over
  // the generic info/purchase page. In Share mode, privateTicketUrl is
  // never used — if that's the only ticket link available, the Ticket
  // button is hidden entirely rather than falling back to it.
  const resolvedTicketUrl = shareMode ? ticketUrl : (privateTicketUrl ?? ticketUrl)

  const actions = [
    location && { label: 'Directions', href: directionsUrl(location)!, icon: Navigation, external: true },
    resolvedTicketUrl && { label: 'Ticket', href: resolvedTicketUrl, icon: Ticket, external: true },
    reservationUrl && { label: 'Reservation', href: reservationUrl, icon: CalendarCheck, external: true },
    websiteUrl && { label: 'Website', href: websiteUrl, icon: Globe, external: true },
    menuUrl && { label: 'Menu', href: menuUrl, icon: UtensilsCrossed, external: true },
    phone && { label: 'Call', href: telUrl(phone)!, icon: Phone, external: false },
    !shareMode && modifyUrl && { label: 'Modify', href: modifyUrl, icon: SquarePen, external: true },
  ].filter((a): a is { label: string; href: string; icon: typeof Navigation; external: boolean } => Boolean(a))

  if (actions.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {actions.map((a) => (
        <a
          key={a.label}
          href={a.href}
          target={a.external ? '_blank' : undefined}
          rel={a.external ? 'noreferrer' : undefined}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-blue transition-colors hover:border-blue/40"
        >
          <a.icon size={12} />
          {a.label}
        </a>
      ))}
    </div>
  )
}
