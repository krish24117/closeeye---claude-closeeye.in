'use client'

/**
 * The Close Eye Connect homepage — the global front door, implemented to the founder's approved
 * content baseline (2026-07-20): Hero → What is CloseEye → How it works → What it understands →
 * Privacy → Family Graph → CTA. Family-Intelligence positioning; no Care/visit/launch-date content.
 * Wording may be lightly refined for rhythm; the story, hierarchy, and positioning are the founder's.
 */
import * as React from 'react'
import Link from 'next/link'
import {
  HeartPulse, Sun, Images, Users, FileText, GraduationCap, Plane, ShieldAlert,
  Lock, ArrowRight, Loader2,
} from 'lucide-react'
import { signInWithGoogle } from '@/lib/auth-actions'
import { GoogleGlyph } from '@/components/ui/google-glyph'

const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = React.useState(false)
  async function go() {
    if (busy) return
    setBusy(true)
    const { error } = await signInWithGoogle()
    if (error) setBusy(false) // web redirects away on success; only reset on error
  }
  return (
    <button
      onClick={go}
      disabled={busy}
      className="inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full !bg-surface-inverse px-7 text-body-sm font-semibold !text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Connecting to Google…</>
        : <><span className="grid h-6 w-6 place-items-center rounded-full bg-ivory"><GoogleGlyph className="h-[1.15rem] w-[1.15rem]" /></span> {label}</>}
    </button>
  )
}

const STEPS = [
  { t: 'Create your Family Space', d: 'A private space where only you decide what Close Eye remembers.' },
  { t: 'Add the people who matter', d: 'Parents, partner, children, siblings, grandparents — anyone important to you.' },
  { t: 'Build understanding together', d: 'Add memories, routines, health information, important documents, milestones, and everyday details over time.' },
  { t: 'Ask naturally', d: 'Ask questions the way you would ask a trusted family member.' },
  { t: 'Receive grounded answers', d: 'Close Eye answers using your family’s shared understanding — not guesses or generic AI responses.' },
]
const ASK_EXAMPLES = [
  'How has Mum been sleeping recently?',
  'What medicines is Dad taking?',
  'When is Siyah’s next school event?',
]
const UNDERSTANDS = [
  { icon: HeartPulse, t: 'Health & wellbeing' },
  { icon: Sun, t: 'Daily life & routines' },
  { icon: Images, t: 'Memories & milestones' },
  { icon: Users, t: 'Family relationships' },
  { icon: FileText, t: 'Important documents' },
  { icon: GraduationCap, t: 'School & learning' },
  { icon: Plane, t: 'Travel & plans' },
  { icon: ShieldAlert, t: 'Emergency guidance' },
]

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 inline-flex items-center gap-2.5 text-caption font-bold uppercase tracking-[0.16em] text-green">
    <span className="h-px w-6 bg-green" />{children}
  </p>
)

export function ConnectHome() {
  return (
    <main id="main" className="bg-ivory text-ink">
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pt-28 pb-20 text-center sm:pt-36 sm:pb-28">
        <h1 style={serif} className="mx-auto max-w-[16ch] text-h1 text-ink">
          The intelligence that knows the people you love.
        </h1>
        <p className="mx-auto mt-7 max-w-[46ch] text-lead text-muted">
          Close Eye is your family’s private intelligence. It learns what matters over time, remembers it
          securely, and helps you understand the people you love with grounded, contextual answers.
        </p>
        <div className="mt-9 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <GoogleButton label="Create my Family Space" />
            <Link
              href="/connect/demo"
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full border border-line bg-card px-6 text-body-sm font-semibold text-ink transition-colors hover:bg-accent-soft/40"
            >
              See how Connect works <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
          <Link href="/auth" className="text-caption font-semibold text-muted hover:text-ink">or continue with email</Link>
        </div>
      </section>

      {/* SECTION 1 — WHAT IS CLOSEEYE */}
      <section className="border-t border-line/70 bg-accent-soft/20">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-20 sm:grid-cols-2 sm:py-28">
          <div>
            <Eyebrow>What is Close Eye</Eyebrow>
            <h2 style={serif} className="text-h2 text-ink">
              More than AI.<br />Family Intelligence.
            </h2>
          </div>
          <div className="flex flex-col justify-center gap-4 text-body text-muted">
            <p>Most AI tools only know what you tell them in a conversation.</p>
            <p>Close Eye builds a private understanding of your family over time. It remembers the people you
              care about, the moments that matter, and the context behind every question — so every answer
              becomes more helpful, more personal, and more grounded.</p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — HOW IT WORKS */}
      <section className="border-t border-line/70">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 style={serif} className="mx-auto max-w-[18ch] text-h2 text-ink">
              How Family Intelligence works
            </h2>
          </div>
          <ol className="mx-auto mt-14 flex max-w-3xl flex-col gap-8">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-5">
                <span style={serif} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-green/30 bg-accent-soft/40 text-h4 font-semibold text-green">{i + 1}</span>
                <div className="pt-1">
                  <h3 className="text-h4 font-semibold text-ink">{s.t}</h3>
                  <p className="mt-1.5 text-body text-muted">{s.d}</p>
                  {i === 3 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {ASK_EXAMPLES.map((q) => (
                        <span key={q} className="rounded-2xl rounded-tl-sm border border-line/70 bg-card px-4 py-2.5 text-body-sm italic text-ink">“{q}”</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECTION 3 — WHAT IT UNDERSTANDS */}
      <section className="border-t border-line/70 bg-accent-soft/20">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <Eyebrow>What it understands</Eyebrow>
            <h2 style={serif} className="mx-auto max-w-[20ch] text-h2 text-ink">
              Your family’s understanding grows over time
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {UNDERSTANDS.map(({ icon: Icon, t }) => (
              <div key={t} className="flex flex-col gap-3 rounded-2xl border border-line/70 bg-card p-5 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
                <span className="text-body-sm font-semibold text-ink">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — PRIVACY */}
      <section className="border-t border-line/70">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-20 sm:grid-cols-[auto_1fr] sm:items-center sm:py-28">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-green"><Lock className="h-7 w-7" strokeWidth={1.6} /></span>
          <div>
            <Eyebrow>Privacy</Eyebrow>
            <h2 style={serif} className="text-h2 text-ink">Private by design</h2>
            <p className="mt-4 max-w-[52ch] text-body text-muted">
              Everything you share belongs to your family. Your information is encrypted, never sold, and only
              used to help Close Eye understand your family better. You can review, update, or delete your
              information at any time.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5 — FAMILY GRAPH.
          NB: use the semantic inverse tokens (surface-inverse / content-inverse), NOT bg-ink/
          text-ivory — this page renders inside the `.cx` scope, which redefines --ink as a raw
          hex, breaking Tailwind's hsl(var(--ink)) utilities. The inverse tokens are HSL and
          are not overridden by .cx, so they render correctly on both surfaces. */}
      <section className="bg-surface-inverse text-content-inverse">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-[42ch] text-center">
            <p className="mb-4 inline-flex items-center gap-2.5 text-caption font-bold uppercase tracking-[0.16em] text-accent-soft"><span className="h-px w-6 bg-accent-soft" />Your Family Graph</p>
            <h2 style={serif} className="text-h2 text-content-inverse">
              Every person has their own evolving understanding.
            </h2>
            <p className="mt-6 text-body text-content-inverse/75">
              Close Eye connects relationships, memories, routines, preferences, important moments, and health
              information into a private Family Graph that grows with your family over time.
            </p>
            <p style={serif} className="mt-8 text-h3 text-content-inverse">
              It doesn’t just answer questions.<br />It understands the context behind them.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 — CTA */}
      <section className="border-t border-line/70">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 style={serif} className="text-h2 text-ink">Start your Family Space</h2>
          <p className="mx-auto mt-5 max-w-[42ch] text-lead text-muted">
            Create your private Family Space and let Close Eye begin understanding the people who matter most.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <GoogleButton label="Create my Family Space" />
            <Link href="/auth" className="inline-flex items-center gap-1 text-caption font-semibold text-muted hover:text-ink">
              or continue with email <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
          <p className="mt-8 text-caption text-muted/80">Private to your family · Encrypted · Never sold</p>
        </div>
      </section>
    </main>
  )
}
