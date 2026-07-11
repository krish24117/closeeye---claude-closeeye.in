import { cn } from '@/lib/utils'

/**
 * Close Eye Logo — the SINGLE source of truth for the brand lockup.
 *
 * DESIGN AUTHORITY (canonical, do not hardcode logo sizes anywhere else):
 * one identity across every surface — the logo never changes proportions between
 * pages, only its context tier. Choose a `variant`; never pass ad-hoc h-/w-/text-
 * sizes for the lockup.
 *
 *   variant     icon    wordmark  gap    where
 *   marketing   32px*   24px*     12px*  marketing site nav, landing, print, error/offline
 *   mobile      28px    20px      10px   mobile/app funnel + auth + onboarding headers
 *   dashboard   26px    18px      10px   dashboard top bars (quieter than marketing)
 *   sidebar     24px    16px      10px   app shells (family / console / guardian / admin)
 *   footer      24px    18px      10px   site footer
 *   (* marketing is responsive: 28/20/10 on mobile → 32/24/12 from sm↑.)
 *
 * Master mark = public/logo-mark.png (the "+"-free sparkle). Wordmark = lowercase
 * "close eye" — the official master wordmark; never recreate, restyle, or resize
 * it independently of the icon. Ratio icon:wordmark ≈ 1:4.5. Clear space ≥ 1× icon
 * width left/right and 0.75× icon height top/bottom — give it room, never crowd it.
 * The logo is not decorative; keep it quiet and never let it compete with the H1.
 */
export type LogoVariant = 'marketing' | 'mobile' | 'dashboard' | 'sidebar' | 'footer'

interface Tier { icon: string; word: string; gap: string; sub: string }

const TIERS: Record<LogoVariant, Tier> = {
  marketing: { icon: 'h-[28px] w-[28px] sm:h-[32px] sm:w-[32px]', word: 'text-[20px] sm:text-[24px]', gap: 'gap-[10px] sm:gap-[12px]', sub: 'text-[0.6rem]' },
  mobile: { icon: 'h-[28px] w-[28px]', word: 'text-[20px]', gap: 'gap-[10px]', sub: 'text-[0.6rem]' },
  dashboard: { icon: 'h-[26px] w-[26px]', word: 'text-[18px]', gap: 'gap-[10px]', sub: 'text-[0.6rem]' },
  sidebar: { icon: 'h-[24px] w-[24px]', word: 'text-[16px]', gap: 'gap-[10px]', sub: 'text-[0.58rem]' },
  footer: { icon: 'h-[24px] w-[24px]', word: 'text-[18px]', gap: 'gap-[10px]', sub: 'text-[0.6rem]' },
}

/**
 * The icon-only master mark. Pass a `variant` for token sizing (matches the lockup
 * icon), or a `className` size for a deliberate one-off brand moment (splash /
 * loading / avatar). Never restyle the artwork itself.
 */
export function LogoMark({ variant, className }: { variant?: LogoVariant; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.png"
      alt="Close Eye"
      className={cn('object-contain', variant && TIERS[variant].icon, className)}
    />
  )
}

/**
 * The full lockup — master mark + lowercase "close eye" wordmark, with an optional
 * product sublabel (e.g. "Operations Admin"). Token-driven; the ONLY approved way
 * to render the Close Eye logo in chrome (nav, headers, sidebars, footer).
 */
export function Logo({
  variant = 'marketing',
  tone = 'dark',
  wordmark = true,
  sublabel,
  className,
}: {
  variant?: LogoVariant
  tone?: 'dark' | 'light'
  wordmark?: boolean
  sublabel?: string
  className?: string
}) {
  const t = TIERS[variant]
  return (
    <span className={cn('inline-flex items-center', t.gap, className)}>
      <LogoMark variant={variant} className="shrink-0" />
      {wordmark && (
        <span className="flex flex-col leading-none">
          <span className={cn('font-extrabold lowercase leading-none tracking-[-0.02em]', t.word, tone === 'light' ? 'text-white' : 'text-ink')}>
            close eye
          </span>
          {sublabel && (
            <span className={cn('mt-1 font-semibold uppercase tracking-[0.16em]', t.sub, tone === 'light' ? 'text-white/70' : 'text-muted')}>
              {sublabel}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
