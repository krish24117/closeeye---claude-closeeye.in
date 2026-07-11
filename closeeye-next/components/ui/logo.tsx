import { cn } from '@/lib/utils'

/**
 * Close Eye Logo — renders the CANONICAL exported master SVG assets.
 *
 * LOCKED by Design Authority (user-approved 2026-07-11). The logo is NEVER
 * reconstructed from an icon + text and carries NO font dependency — every
 * surface renders the same exported SVG (`public/brand/close-eye-*.svg`), so the
 * brand is pixel-identical everywhere. No new variations, spacing changes, or
 * font substitutions may be introduced.
 *
 *   lockup  horizontal  → PRIMARY: nav, headers, sidebars, footer, funnel, auth, errors
 *           stacked     → marketing + splash screens ONLY
 *           icon        → app icons, favicons, avatars, compact interfaces
 *
 * `variant` sets only the display HEIGHT per context; the whole asset scales
 * uniformly, so its proportions and internal spacing (baked into the SVG) can
 * never drift.
 */
export type LogoLockup = 'horizontal' | 'stacked' | 'icon'
export type LogoVariant = 'marketing' | 'mobile' | 'dashboard' | 'sidebar' | 'footer'

// Display height (px) of the horizontal lockup per context. `sidebar` is ~14%
// quieter than the app default so the workspace stays visually dominant.
const HEIGHT: Record<LogoVariant, number> = {
  marketing: 34,
  mobile: 30,
  dashboard: 28,
  sidebar: 24,
  footer: 30,
}

const isWhite = (tone?: string) => tone === 'white' || tone === 'light'
const assetSrc = (lockup: LogoLockup, white: boolean) =>
  lockup === 'icon' ? '/brand/close-eye-icon.svg' : `/brand/close-eye-${lockup}${white ? '-white' : ''}.svg`

/**
 * Icon-only master mark (the canonical icon SVG) — for avatars, favicons and
 * compact interfaces. Size via a `variant` height, or an explicit className.
 */
export function LogoMark({ variant, className }: { variant?: LogoVariant; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/close-eye-icon.svg"
      alt="Close Eye"
      className={className}
      style={variant ? { height: HEIGHT[variant], width: 'auto' } : undefined}
    />
  )
}

/** The canonical Close Eye logo lockup — an exported SVG master asset. */
export function Logo({
  variant = 'marketing',
  lockup,
  tone = 'ink',
  wordmark = true,
  sublabel,
  height,
  className,
}: {
  variant?: LogoVariant
  lockup?: LogoLockup
  /** 'dark'/'light' accepted as aliases of 'ink'/'white' for back-compat. */
  tone?: 'ink' | 'white' | 'dark' | 'light'
  wordmark?: boolean
  sublabel?: string
  height?: number
  className?: string
}) {
  const lk: LogoLockup = lockup ?? (wordmark === false ? 'icon' : 'horizontal')
  const h = height ?? HEIGHT[variant]
  const white = isWhite(tone)
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={assetSrc(lk, white)} alt="Close Eye" style={{ height: h, width: 'auto' }} className={cn(!sublabel && className)} />
  )
  if (!sublabel) return img
  return (
    <span className={cn('inline-flex flex-col gap-1', className)}>
      {img}
      <span className={cn('text-[0.58rem] font-semibold uppercase leading-none tracking-[0.16em]', white ? 'text-white/70' : 'text-muted')}>
        {sublabel}
      </span>
    </span>
  )
}
