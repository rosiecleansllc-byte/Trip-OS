import type { CSSProperties } from 'react'
import { ImageIcon } from 'lucide-react'

export function ImagePlaceholder({
  label,
  className = '',
  imageUrl,
  fit = 'contain',
  onClick,
  style,
}: {
  label: string
  className?: string
  imageUrl?: string
  /** 'contain' (default) never crops a garment — real product photos should use it.
   *  Use 'cover' only for purely decorative fills where cropping is fine. */
  fit?: 'contain' | 'cover'
  onClick?: () => void
  /** e.g. { objectPosition: 'center 30%' } for responsive cropping of a cover image */
  style?: CSSProperties
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={label}
        onClick={onClick}
        style={style}
        className={`bg-bg-soft ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${onClick ? 'cursor-zoom-in' : ''} ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 bg-bg-soft text-gray ${className}`}
      role="img"
      aria-label={label}
    >
      <ImageIcon size={20} strokeWidth={1.5} />
      <span className="px-2 text-center text-[11px] leading-tight">{label}</span>
    </div>
  )
}
