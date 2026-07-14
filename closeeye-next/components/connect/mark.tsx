/**
 * Close Eye brand assets for /connect — the real exported brand files
 * (public/connect/*.svg, copied from public/brand), used without alteration.
 * Rendered as background images so we never inline or restyle the logo.
 * Server-safe, lint-safe (no <img>).
 */

/** The icon-only mark. */
export function Mark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        flex: '0 0 auto',
        width: size,
        height: size,
        backgroundImage: "url('/connect/logo-icon.svg')",
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    />
  )
}

// The horizontal lockup's true proportions (viewBox 0 0 1407.5 272).
const LOGO_RATIO = 1407.5 / 272

/** The full horizontal lockup (icon + "close eye" wordmark) — the original site logo. */
export function Logo({ height = 26, white = false, className }: { height?: number; white?: boolean; className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label="Close Eye"
      style={{
        display: 'inline-block',
        flex: '0 0 auto',
        height,
        width: Math.round(height * LOGO_RATIO),
        backgroundImage: `url('/connect/${white ? 'logo-white' : 'logo'}.svg')`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
      }}
    />
  )
}
