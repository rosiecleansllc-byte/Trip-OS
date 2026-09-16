import { CalendarCheck, Globe, Navigation, Phone, SquarePen, Ticket, UtensilsCrossed } from 'lucide-react'
import type { LinkActions } from '../../types/trip'
import { directionsUrl, telUrl } from '../../lib/links'
import { shareSafeActions } from '../../lib/shareMode'
import { PrivateDocumentAction } from './PrivateDocumentAction'

interface ActionRowProps extends LinkActions {
  location?: string
  // Required, never defaulted: a default would mean a call site that
  // forgets this prop silently renders the Modify link and the private
  // document button to whoever is holding the phone.
  shareMode: boolean
  className?: string
}

export function ActionRow({ location, shareMode, className = '', ...links }: ActionRowProps) {
  // One policy, applied before anything is read — see lib/shareMode.ts.
  const { websiteUrl, ticketUrl, reservationUrl, menuUrl, phone, privateTicketUrl, modifyUrl, privateDocumentKey, privateDocumentLabel, privateDocumentType } =
    shareSafeActions(links, shareMode)

  // Outside Share mode, prefer the traveler's actual purchased ticket over
  // the generic info/purchase page. In Share mode privateTicketUrl has
  // already been cleared above, so if that was the only ticket link the
  // button is dropped rather than falling back to it.
  const resolvedTicketUrl = privateTicketUrl ?? ticketUrl

  const actions = [
    location && { label: 'Directions', href: directionsUrl(location)!, icon: Navigation, external: true },
    resolvedTicketUrl && { label: 'Ticket', href: resolvedTicketUrl, icon: Ticket, external: true },
    reservationUrl && { label: 'Reservation', href: reservationUrl, icon: CalendarCheck, external: true },
    websiteUrl && { label: 'Website', href: websiteUrl, icon: Globe, external: true },
    menuUrl && { label: 'Menu', href: menuUrl, icon: UtensilsCrossed, external: true },
    phone && { label: 'Call', href: telUrl(phone)!, icon: Phone, external: false },
    modifyUrl && { label: 'Modify', href: modifyUrl, icon: SquarePen, external: true },
  ].filter((a): a is { label: string; href: string; icon: typeof Navigation; external: boolean } => Boolean(a))

  // The private-document action (Add/View a locally-stored ticket,
  // reservation, or confirmation) follows the same rule as modifyUrl —
  // the key is already cleared in Share mode above. Unlike every other
  // action here it's never a URL — see PrivateDocumentAction.
  const showDocumentAction = Boolean(privateDocumentKey)

  if (actions.length === 0 && !showDocumentAction) return null

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
      {showDocumentAction && (
        <PrivateDocumentAction docKey={privateDocumentKey!} label={privateDocumentLabel} docType={privateDocumentType} />
      )}
    </div>
  )
}
