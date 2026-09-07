import { ImageIcon } from 'lucide-react'

export function ImagePlaceholder({
  label,
  className = '',
  imageUrl,
}: {
  label: string
  className?: string
  imageUrl?: string
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt={label} className={`object-cover ${className}`} />
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
