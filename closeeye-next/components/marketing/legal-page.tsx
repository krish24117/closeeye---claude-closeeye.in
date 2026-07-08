import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

/** One warm, plain-language layout for every legal & policy page (matches /privacy). */
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { h: string; p: string }[] }) {
  return (
    <Container className="max-w-measure section-pad pt-32 sm:pt-36">
      <Button asChild variant="text">
        <Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link>
      </Button>
      <h1 className="mt-8 text-h2">{title}</h1>
      <p className="mt-4 text-lead text-muted">{intro}</p>
      <div className="mt-12 flex flex-col gap-10">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-h3">{s.h}</h2>
            <p className="mt-2 text-body leading-relaxed text-muted">{s.p}</p>
          </section>
        ))}
      </div>
      <p className="mt-16 text-caption text-muted">Last updated 7 July 2026 · This is a plain-language summary, not a substitute for the full agreement provided at sign-up.</p>
    </Container>
  )
}
