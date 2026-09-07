import type { PropsWithChildren } from 'react'

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgba(28,26,23,0.04)] ${className}`}>
      {children}
    </div>
  )
}
