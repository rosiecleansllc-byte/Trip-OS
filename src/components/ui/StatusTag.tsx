import type { BookingStatus } from '../../types/trip'

const STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-blue-tint text-blue border-blue-dim/30',
  paid: 'bg-good-tint text-good border-good/25',
  pending: 'bg-warn-tint text-warn border-warn/25',
  optional: 'bg-ivory-dim text-ink-soft border-line',
  cancelled: 'bg-alert-tint text-alert border-alert/25 line-through',
}

const LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  paid: 'Paid',
  pending: 'Pending',
  optional: 'Optional',
  cancelled: 'Cancelled',
}

export function StatusTag({ status, className = '' }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  )
}
