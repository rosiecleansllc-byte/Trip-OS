import type { PropsWithChildren, ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  action,
  children,
}: PropsWithChildren<{ eyebrow?: string; title: string; action?: ReactNode }>) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray">{eyebrow}</p>}
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {children}
      </div>
      {action}
    </div>
  )
}
