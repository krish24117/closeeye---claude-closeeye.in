import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { whatsappLink } from '@/lib/site'

export function FinalCta() {
  return (
    <section id="get-started" className="bg-ink">
      <Container className="section-pad">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="eyebrow is-light is-centered">Peace of mind, today</span>
          <h2 className="mt-6 text-h2 text-white">Would you trust us with your own parents?</h2>
          <p className="mt-5 text-lead text-white/70">
            That&apos;s the only question we ask of ourselves. Tell us who you love and
            where they are — we&apos;ll take it from there, with the care we&apos;d want
            for our own family.
          </p>

          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" onDark className="w-full sm:w-auto">
              <Link href="/book">
                Check on My Family <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" onDark className="w-full sm:w-auto">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" strokeWidth={1.5} /> WhatsApp
              </a>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
