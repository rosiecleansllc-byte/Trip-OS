import type { EventSession } from '../../types/trip'
import { formatTime } from '../../lib/date'

// Renders a parent event's traveler-selected personal sessions (see
// types/trip.ts EventSession) as a clean nested mini-timeline — the
// public event's own ticket/action stays on the parent ScheduleItem
// above this, never duplicated per session. Generic across any trip/
// event: nothing here is specific to a particular summit or conference.
export function EventSessionSchedule({ sessions, title = 'My Schedule' }: { sessions: EventSession[]; title?: string }) {
  if (sessions.length === 0) return null
  return (
    <div className="mt-3 rounded-xl border border-line bg-bg-soft p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">{title}</p>
      <ol className="space-y-2.5">
        {sessions.map((session) => (
          <li key={session.id} className="flex gap-2.5 text-sm">
            <span className="w-24 shrink-0 text-xs text-blue">
              {formatTime(session.startTime)} – {formatTime(session.endTime)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">{session.title}</p>
              <p className="text-xs text-ink-soft">
                {session.room}
                {session.speaker ? ` · ${session.speaker}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
