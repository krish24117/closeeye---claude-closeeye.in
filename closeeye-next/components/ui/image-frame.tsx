import Image from 'next/image'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Art-directed image slot. Renders a real photo when `src` is provided (with the
 * brand's subtle warm treatment); otherwise shows an elegant, on-brand
 * placeholder carrying the photography direction so a real image drops straight
 * in later. Keeps aspect ratios and treatment identical across the site.
 */
export function ImageFrame({
  src,
  alt,
  direction,
  ratio = 'portrait',
  priority = false,
  gradient = false,
  className,
  sizes = '(max-width: 1024px) 100vw, 560px',
}: {
  src?: string
  alt?: string
  /** Art-direction note shown in the placeholder (and useful as documentation). */
  direction?: string
  ratio?: 'portrait' | 'landscape' | 'square' | 'wide'
  priority?: boolean
  gradient?: boolean
  className?: string
  sizes?: string
}) {
  const ratioClass = {
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[3/2]',
    square: 'aspect-square',
    wide: 'aspect-[16/9]',
  }[ratio]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-accent-soft',
        ratioClass,
        gradient && 'photo-frame',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className="photo-warm object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-green shadow-sm">
            <Camera className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          {direction && (
            <p className="max-w-[26ch] text-body-sm italic text-green/80">{direction}</p>
          )}
          <span className="text-caption uppercase tracking-widest text-green/50">
            Photography
          </span>
        </div>
      )}
    </div>
  )
}
