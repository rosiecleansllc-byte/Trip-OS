import type { PropsWithChildren, ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  action,
  accent,
  children,
}: PropsWithChildren<{ eyebrow?: string; title: string; action?: ReactNode; accent?: 'red' }>) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">{eyebrow}</p>}
        <h2 className="font-display text-xl text-blue">{title}</h2>
        {accent === 'red' && <div className="mt-1.5 h-px w-8 bg-red" />}
        {children}
      </div>
      {action}
    </div>
  )
}
