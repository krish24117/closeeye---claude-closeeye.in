import Link from 'next/link'
import { MessageCircle, Mail, Phone, MapPin, Clock, ExternalLink } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Container } from '@/components/ui/container'
import { SocialLinks } from '@/components/ui/social-icons'
import { FOOTER_GROUPS, LEGAL_LINKS, SITE, whatsappLink } from '@/lib/site'

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-body-sm font-medium text-white/80">{SITE.shortTagline}</p>
            <p className="mt-3 text-body-sm leading-relaxed text-white/55">
              {SITE.legalName} is a trusted human presence for the people you love —
              so no family faces life&apos;s important moments alone.
            </p>
            <SocialLinks className="-ml-2 mt-6" />
          </div>

          {/* Link groups: Quick Links, Support */}
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-caption uppercase tracking-widest text-white/40">{group.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div>
            <p className="text-caption uppercase tracking-widest text-white/40">Contact</p>
            <ul className="mt-4 flex flex-col gap-3 text-body-sm text-white/70">
              <li>
                <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <Mail className="h-4 w-4 shrink-0" strokeWidth={1.5} /> {SITE.email}
                </a>
              </li>
              <li>
                <a href={SITE.phoneHref} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} /> {SITE.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} /> WhatsApp support
                </a>
              </li>
              {SITE.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="leading-relaxed">
                    {SITE.address}
                    {SITE.mapsUrl && (
                      <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 text-white/60 underline-offset-2 transition-colors hover:text-white hover:underline">
                        Map <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                      </a>
                    )}
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2 text-white/55">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} /> {SITE.hours}
              </li>
            </ul>
          </div>
        </div>

        {/* Legal */}
        <nav aria-label="Legal" className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-8">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-caption text-white/50 transition-colors hover:text-white">{l.label}</Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-2 text-caption text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {SITE.legalName} · {SITE.legalEntity}</p>
          <p className="flex items-center gap-3">
            <span>v{SITE.version}</span>
            <span aria-hidden="true">·</span>
            <span>Made with care in India.</span>
          </p>
        </div>
      </Container>
    </footer>
  )
}
