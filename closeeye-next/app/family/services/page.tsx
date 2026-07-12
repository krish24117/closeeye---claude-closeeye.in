import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { SERVICE_DETAILS } from '@/lib/services'
import { ServicesMembership } from '@/components/family/services-membership'

/**
 * The in-app Services space — browse the three ways Close Eye can be there and
 * book, without ever leaving the app. Reuses the Services photos + copy
 * (SERVICE_DETAILS); anchored section ids let the Home strip deep-link here.
 */
export default function FamilyServicesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ways to be there" subtitle="Choose how Close Eye can be there for the people you love." />

      <div className="flex flex-col gap-6">
        {SERVICE_DETAILS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
            <ImageFrame
              ratio="landscape"
              gradient
              src={s.image}
              alt={s.imageAlt}
              direction={s.photoDirection}
              sizes="(max-width: 768px) 100vw, 720px"
              className="rounded-none border-0"
            />
            <div className="flex flex-col gap-5 p-6">
              <div>
                <p className="text-caption font-semibold uppercase tracking-widest text-green">{s.tagline}</p>
                <h2 className="mt-1.5 text-h4 text-ink">{s.name}</h2>
                <p className="mt-2 text-body-sm text-muted">{s.description}</p>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {s.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-body-sm text-ink">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
                <Button asChild size="md">
                  <Link href={`/family/book?service=${s.id}`}>
                    Book {s.name} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
                <span className="text-body-sm text-muted">
                  From <span className="font-semibold text-ink">{s.priceFrom}</span>
                </span>
              </div>
            </div>
          </section>
        ))}
      </div>

      <ServicesMembership />
    </div>
  )
}
