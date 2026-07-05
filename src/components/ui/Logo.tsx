/* ── CloseEye Logo ────────────────────────────────────────────────────────
   Single source of truth for all logo rendering.
   Asset: /ce-logo.png — the official rounded-cross mark.

   Use <Logo> for the mark only (nav, standalone icon).
   Use <LogoLockup> for the full mark + wordmark row shown on every screen.
   Wrap with <Link>/<a> at the call site if navigation is needed.

   Brand rules: never rotate, recolor, add shadow, crop, or overlay the mark.
   Alt text is always "CloseEye Official Logo". */

export function Logo({
  className,
  style,
  size = 32,
}: {
  className?: string
  style?: React.CSSProperties
  size?: number
}) {
  return (
    <img
      src="/ce-logo.png"
      alt="CloseEye Official Logo"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      draggable={false}
    />
  )
}

/* ── Lockup (mark + wordmark) ─────────────────────────────────────────────
   Props:
     fontSize  – wordmark font size in px (mark scales proportionally)
     color     – 'dark' for light backgrounds, 'light' for dark backgrounds */

export function LogoLockup({
  fontSize = 20,
  color = 'dark',
  style,
}: {
  fontSize?: number
  color?: 'dark' | 'light'
  style?: React.CSSProperties
}) {
  const markSize = Math.round(fontSize * 1.4)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        ...style,
      }}
    >
      <Logo size={markSize} />
      <span
        style={{
          fontFamily: "'Open Sauce One', system-ui, sans-serif",
          fontWeight: 800,
          fontSize,
          color: color === 'dark' ? '#0E2A1F' : 'rgba(255,255,255,0.92)',
          letterSpacing: '-.02em',
          lineHeight: 1,
        }}
      >
        close eye
      </span>
    </span>
  )
}
