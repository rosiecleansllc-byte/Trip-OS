import { AlertTriangle, Bell, Calendar, DoorOpen, FileWarning, LogOut, Navigation, PlaneTakeoff } from 'lucide-react'
import type { AlertPriority, AlertType } from '../../lib/alerts'

export const ALERT_TYPE_ICON: Record<AlertType, typeof Bell> = {
  'leave-soon': Navigation,
  upcoming: Calendar,
  'travel-day': PlaneTakeoff,
  checkin: DoorOpen,
  checkout: LogOut,
  'missing-document': FileWarning,
  'cancellation-deadline': AlertTriangle,
  readiness: AlertTriangle,
}

// Kept to the app's two-accent palette (blue/red — see index.css) rather
// than introducing new colors for a third priority tier: critical is
// red, important is blue, info is neutral ink-soft/bg-soft.
export const PRIORITY_TEXT: Record<AlertPriority, string> = {
  critical: 'text-red',
  important: 'text-blue',
  info: 'text-ink-soft',
}

export const PRIORITY_BG: Record<AlertPriority, string> = {
  critical: 'bg-red-tint border-red/20',
  important: 'bg-blue-tint border-blue/20',
  info: 'bg-bg-soft border-line',
}
