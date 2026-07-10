import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { ImageFrame } from '@/components/ui/image-frame'
import { Quote } from '@/components/ui/quote'
import { ShareButtons } from '@/components/marketing/share-buttons'
import { FOUNDER } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Founder Story',
  description:
    'Why Close Eye exists — the story of one quiet hospital room, and the promise it became.',
}

const STORY: string[] = [
  'A little while ago, on a June morning, my daughter was born. It was the happiest day of my life — and, unexpectedly, one of the loneliest. In that room there were only a few of us. Everyone else I loved was far away.',
  'I held my daughter for the first time and wanted to tell the whole world. And I realised I had almost no one to call. For the first time, I understood what loneliness feels like in life’s most precious moment.',
  'Then a thought came — the one every parent quietly carries. Not someone to replace family. Something to strengthen it. A trusted circle. A trusted presence. Someone who would stand beside the people we love, when we can’t be there ourselves.',
  'That was the moment Close Eye stopped being a startup idea and became my responsibility. So that no family faces life’s most important moments alone.',
]

export default function FounderStoryPage() {
  return (
    <article>
      {/* Editorial masthead */}
      <header className="bg-ink pt-32 sm:pt-36">
        <Container className="pb-14">
          <div className="mb-8">
            <Button asChild variant="text" onDark>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home
              </Link>
            </Button>
          </div>
          <span className="eyebrow is-light">Founder Story</span>
          <h1 className="mt-5 max-w-3xl text-h1 text-white">
            When you can&apos;t be there.
          </h1>
          <p className="mt-6 max-w-xl text-lead text-white/65">
            The quiet moment that turned a feeling every family carries into a
            company built entirely on trust.
          </p>
        </Container>
      </header>

      {/* Portrait — editorial, magazine register (not a passport photo) */}
      <div className="bg-ink">
        <Container className="pb-16">
          <figure className="mx-auto max-w-sm">
            <ImageFrame
              src={FOUNDER.portrait}
              alt={`${FOUNDER.name}, Founder of Close Eye`}
              ratio="portrait"
              priority
              className="shadow-lg"
              sizes="(max-width: 640px) 100vw, 384px"
            />
            <figcaption className="mt-4 text-center text-caption text-white/45">
              {FOUNDER.name}, Founder of Close Eye
            </figcaption>
          </figure>
        </Container>
      </div>

      {/* The story */}
      <Container className="section-pad">
        <div className="mx-auto max-w-prose">
          <p className="text-lead text-ink">{FOUNDER.excerpt}</p>
          <div className="mt-8 flex flex-col gap-6 text-body text-ink/85">
            {STORY.slice(0, 2).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>

          <div className="my-12 border-y border-line py-10">
            <Quote size="hero">
              We don&apos;t replace family. We help it stay close — even across an
              ocean.
            </Quote>
          </div>

          <div className="flex flex-col gap-6 text-body text-ink/85">
            {STORY.slice(2).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <p className="text-ink">— {FOUNDER.name}, Founder</p>
          </div>

          <div className="mt-12 flex flex-col gap-8 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild>
              <Link href="/book">
                Check on My Family <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            </Button>
            <ShareButtons title="Why Close Eye exists — the founder’s story" />
          </div>
        </div>
      </Container>
    </article>
  )
}
