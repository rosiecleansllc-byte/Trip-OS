import type { BookingStatus } from '../../types/trip'

const STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-blue-tint text-blue border-blue/20',
  paid: 'bg-blue text-white border-blue',
  pending: 'bg-white text-red border-red',
  optional: 'bg-bg-soft text-ink-soft border-line',
  cancelled: 'bg-bg-soft text-ink-soft border-line line-through',
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
