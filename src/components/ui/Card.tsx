import type { PropsWithChildren } from 'react'
import { clsx } from 'clsx'

export function Card({
  children,
  className = '',
  accent,
}: PropsWithChildren<{ className?: string; accent?: 'blue' | 'red' }>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(17,17,17,0.04)]',
        accent === 'blue' && 'border-t-[3px] border-t-blue',
        accent === 'red' && 'border-t-[3px] border-t-red',
        className
      )}
    >
      {children}
    </div>
  )
}
