import Image from 'next/image'
import { getLaunchMode, MODE_CONFIG } from '@/components/connect/config'
import { Logo } from '@/components/connect/mark'
import { SiteNav, Reveal, AskDemo, FoundingForm } from '@/components/connect/interactive'

/**
 * Close Eye Connect — the launch experience. Six sections, each answering exactly
 * one question, understood by experience rather than reading. Connect (Family
 * Intelligence) leads; Care is the human layer it activates. Interaction and calm
 * motion replace paragraphs. Server component; the alive pieces are client.
 *
 *   1 Hero · 2 Ask (the centrepiece) · 3 How it works · 4 Trust · 5 Care · 6 Founding
 */
export default function ConnectPage() {
  const mode = getLaunchMode()
  const cfg = MODE_CONFIG[mode]
  const navCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your place'
  const heroCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your family’s place'

  const steps = [
    { n: '1', h: 'Tell us who', s: 'The people you love.' },
    { n: '2', h: 'Connect learns them', s: 'Routines, moods, what matters.' },
    { n: '3', h: 'Ask anytime', s: 'Answers that know your family.' },
    { n: '4', h: 'Real help arrives', s: 'A person, when it’s needed.' },
  ]

  return (
    <>
      <SiteNav ctaLabel={navCta} />

      <main>
        {/* 1 · HERO — one question: what is this? */}
        <section className="cx-hero cx-wrap" aria-labelledby="cx-hero-h">
          <div className="cx-glow" aria-hidden="true" />
          <span className="cx-pill"><span className="cx-dot" /> {cfg.pill}</span>
          <h1 id="cx-hero-h">Your family&rsquo;s trusted intelligence.</h1>
          <p className="cx-lead">Close&nbsp;Eye Connect knows the people you love — and brings real help when they truly need it.</p>
          <div className="cx-herocta">
            <a className="cx-btn cx-btn-primary" href="#founding">{heroCta}</a>
          </div>
          <p className="cx-heronote">No payment today. Just your family&rsquo;s place, held.</p>
          <a className="cx-scrollcue" href="#ask" aria-label="See it in action">
            <span aria-hidden="true"></span>
          </a>
        </section>

        {/* 2 · ASK — the centrepiece. One question: how does it feel? */}
        <section className="cx-section cx-wrap cx-asksec" id="ask" aria-labelledby="cx-ask-h">
          <div className="cx-preview">
            <Reveal>
              <div className="cx-previewcopy">
                <p className="cx-eyebrow">Try it</p>
                <h2 id="cx-ask-h">Ask anything about the people you love.</h2>
                <p>Type a question. Watch Connect reason — and see why it only answers once it truly knows your family.</p>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <AskDemo />
            </Reveal>
          </div>
        </section>

        {/* 3 · HOW IT WORKS — one question: what do I do? A guided journey. */}
        <section className="cx-section cx-wrap cx-divider" id="how" aria-labelledby="cx-how-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">How it works</p>
              <h2 id="cx-how-h">Four quiet steps.</h2>
            </div>
          </Reveal>
          <Reveal>
            <ol className="cx-journey cx-journey-stagger">
              {steps.map((st) => (
                <li key={st.n} className="cx-jstep">
                  <span className="cx-jnum" aria-hidden="true">{st.n}</span>
                  <div><h3>{st.h}</h3><p>{st.s}</p></div>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* 4 · TRUST — one question: can I trust it? Revealed one at a time. */}
        <section className="cx-section cx-wrap cx-divider" aria-labelledby="cx-trust-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">Built on trust</p>
              <h2 id="cx-trust-h">Yours alone. Shared with no one without your say.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-trust cx-trust-stagger">
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                <h3>Consent-first</h3>
                <p>Nothing is shared without your say.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></span>
                <h3>Verified people</h3>
                <p>Every visitor is background-checked and trained.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <h3>Ready when it matters</h3>
                <p>Help arrives the moment something’s wrong.</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 5 · CARE — one question: when is a human needed? One cinematic moment. */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-care-h">
          <div className="cx-cinema">
            <Reveal className="cx-cinema-fig">
              <div className="cx-cinema-photo">
                <Image src="/connect/guardian-companion.png" alt="A Close Eye Guardian sitting with an elder, looking through a photo album together" fill sizes="(max-width: 900px) 92vw, 52vw" />
              </div>
            </Reveal>
            <Reveal delay={110}>
              <div className="cx-cinema-copy">
                <p className="cx-eyebrow">When a human is needed</p>
                <h2 id="cx-care-h">Connect sends Close&nbsp;Eye Care.</h2>
                <p>When someone truly needs a person beside them, Connect activates a verified Guardian in&nbsp;India — arranged for you. You never set it up.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6 · FOUNDING — one question: how do I join? The closing moment. */}
        <section className="cx-section cx-wrap cx-founding" id="founding" aria-labelledby="cx-found-h">
          <Reveal>
            <p className="cx-tagline">When you can&rsquo;t be there, Close&nbsp;Eye can.</p>
          </Reveal>
          <Reveal delay={90}>
            <div className="cx-foundingcard">
              <div className="cx-fglow" aria-hidden="true" />
              <p className="cx-eyebrow cx-center">Founding 1,000</p>
              <h2 id="cx-found-h">{cfg.founding.headline}</h2>
              <p className="cx-fp">{cfg.founding.body}</p>
              <FoundingForm cta={cfg.founding.cta} note={cfg.founding.note} handoff={cfg.handoff} />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="cx-footer">
        <div className="cx-wrap">
          <div className="cx-footgrid">
            <div className="cx-footbrand">
              <Logo height={26} />
              <p>A calm presence for the people you love.</p>
            </div>
            <nav className="cx-footlinks" aria-label="Footer">
              <a href="#ask">See it</a>
              <a href="#how">How it works</a>
              <a href="#founding">Reserve a place</a>
            </nav>
          </div>
          <div className="cx-footlegal">
            <span>© 2026 Close Eye</span>
            <span>Made with care in Hyderabad, for families everywhere.</span>
          </div>
        </div>
      </footer>

      {cfg.showRibbon && (
        <div className="cx-ribbon" role="status"><span className="cx-dot" /> Internal preview — not public</div>
      )}
    </>
  )
}
