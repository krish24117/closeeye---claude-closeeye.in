import { activeSocialLinks, SITE } from '@/lib/site'
import { BrandGlyph } from '@/components/ui/brand-glyph'
import { cn } from '@/lib/utils'

/**
 * Official social profiles as a monochrome icon row. Renders nothing when no
 * profile is configured — a broken/mock link never ships. Marketing site only.
 */
export function SocialLinks({ className }: { className?: string }) {
  const links = activeSocialLinks()
  if (links.length === 0) return null
  return (
    <ul className={cn('flex items-center gap-1', className)} aria-label={`${SITE.name} on social media`}>
      {links.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow ${SITE.name} on ${s.label}`}
            className="grid h-9 w-9 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
          >
            <BrandGlyph name={s.key} />
          </a>
        </li>
      ))}
    </ul>
  )
}
