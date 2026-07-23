import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Container } from '@/components/ui/container'
import { SocialLinks } from '@/components/ui/social-icons'
import { LEGAL_LINKS, SITE } from '@/lib/site'

/**
 * A premium consumer footer, not a company directory. Two beats: a final
 * conversion moment that leaves the visitor invited to act, then a minimal
 * signature — brand · social · legal · copyright. Detailed contact (email,
 * phone, address, hours) lives on the dedicated /contact page reached from the
 * main navigation, not here.
 */
export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <Container className="py-14 sm:py-16">
        {/* Final conversion moment — the page ends on an invitation, not a directory. */}
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 text-center">
          <h2 className="font-display text-h2 text-white">Need help deciding?</h2>
          <p className="max-w-md text-body text-white/60">
            Talk to a Close Eye Advisor — a real person who’ll help you find the right way to be there for the people you love.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-ivory px-6 py-3 text-body-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            Talk to an advisor <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {/* Minimal signature. */}
        <div className="mt-14 flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
          <Logo variant="footer" tone="light" />
          <SocialLinks />
        </div>
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-start">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-caption text-white/50 transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-caption text-white/40">© 2026 {SITE.legalName} · Made with care in India.</p>
        </div>
      </Container>
    </footer>
  )
}
