/**
 * Close Eye brand mark for /connect — renders the real exported brand asset
 * (public/brand/close-eye-icon.svg) as a background image, so we use the true
 * logo without inlining or altering it. Server-safe, lint-safe (no <img>).
 */
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
        backgroundImage: "url('/brand/close-eye-icon.svg')",
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    />
  )
}
