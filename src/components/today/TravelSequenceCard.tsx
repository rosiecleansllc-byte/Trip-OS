import { ArrowDown } from 'lucide-react'
import type { TravelSequenceStep } from '../../lib/travelSequence'
import { ActionRow } from '../ui/ActionRow'
import { Card } from '../ui/Card'

// A compact, reusable "rest of today's route" timeline — one row per
// real leg/lodging event (see lib/travelSequence.ts), connected by a
// simple arrow rather than full booking cards, so a traveler mid-travel-
// day can see what's now → what's after landing/arriving → where next
// at a glance. Renders nothing trip- or day-specific beyond whatever
// getTravelSequenceForDay hands it.
export function TravelSequenceCard({ steps, shareMode }: { steps: TravelSequenceStep[]; shareMode: boolean }) {
  if (steps.length === 0) return null
  return (
    <Card className="p-4">
      {steps.map((step, i) => (
        <div key={step.id}>
          {i > 0 && (
            <div className="flex justify-center py-1.5 text-ink-soft">
              <ArrowDown size={14} />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-ink">{step.label}</p>
            {step.caption && <p className="text-xs text-ink-soft">{step.caption}</p>}
            <ActionRow
              location={step.location}
              websiteUrl={step.websiteUrl}
              ticketUrl={step.ticketUrl}
              reservationUrl={step.reservationUrl}
              menuUrl={step.menuUrl}
              phone={step.phone}
              privateTicketUrl={step.privateTicketUrl}
              modifyUrl={step.modifyUrl}
              privateDocumentKey={step.privateDocumentKey}
              privateDocumentLabel={step.privateDocumentLabel}
              privateDocumentType={step.privateDocumentType}
              shareMode={shareMode}
              className="mt-1.5"
            />
          </div>
        </div>
      ))}
    </Card>
  )
}
