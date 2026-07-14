import { getLaunchMode, MODE_CONFIG } from '@/components/connect/config'
import { Mark } from '@/components/connect/mark'
import { SiteNav, Reveal, AskPreview, FoundingForm } from '@/components/connect/interactive'

/**
 * Close Eye Connect — the standalone launch page. Server component; only the
 * interactive pieces (nav, reveal, Ask preview, sign-up) are client. Behaviour
 * flexes through the launch-mode config (preview → early_access → public →
 * closed_waitlist).
 */
export default function ConnectPage() {
  const mode = getLaunchMode()
  const cfg = MODE_CONFIG[mode]
  const navCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Join the Founding 1,000'

  return (
    <>
      <SiteNav ctaLabel={navCta} />

      <main>
        {/* 1 · HERO */}
        <section className="cx-hero cx-wrap" aria-labelledby="cx-hero-h">
          <div className="cx-glow" aria-hidden="true" />
          <span className="cx-pill"><span className="cx-dot" /> {cfg.pill}</span>
          <h1 id="cx-hero-h">Stay close to the people you can&rsquo;t be near.</h1>
          <p className="cx-lead">A calm, always-there presence for the people you love — so distance never means being out of touch.</p>
          <div className="cx-herocta">
            <a className="cx-btn cx-btn-primary" href="#founding">{navCta}</a>
            <a className="cx-btn cx-btn-ghost" href="#preview">See how it feels</a>
          </div>
          <p className="cx-heronote">No payment today. Just your place, held.</p>
        </section>

        {/* 2 · HUMAN PROBLEM */}
        <section className="cx-section cx-wrap cx-problem" aria-labelledby="cx-prob-h">
          <Reveal>
            <p className="cx-eyebrow">The quiet worry</p>
            <h2 id="cx-prob-h">Love doesn&rsquo;t fade with distance. Staying close just gets harder.</h2>
            <p className="cx-p">A parent in another city. A call you keep meaning to make. The small, constant not-knowing — <b>did they eat, are they well, are they lonely.</b> You&rsquo;d give anything to simply be in the room.</p>
            <p className="cx-whisper">You shouldn&rsquo;t have to choose between your life and their care.</p>
          </Reveal>
        </section>

        {/* 3 · WHAT IT IS */}
        <section className="cx-section cx-wrap cx-divider" aria-labelledby="cx-what-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">What it is</p>
              <h2 id="cx-what-h">A trusted presence between every visit.</h2>
              <p>Close Eye Connect keeps your whole family gently in the loop — and sends real people to look in on the ones you love. Ask anything about their wellbeing, any hour, and hear back the way you would from someone who was just in the room.</p>
            </div>
          </Reveal>
        </section>

        {/* 4 · WHY DIFFERENT */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-why-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">Why it&rsquo;s different</p>
              <h2 id="cx-why-h">Not an assistant. A companion your family can trust.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-truths">
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>
                <h3>Real people, not just software</h3>
                <p>Guardians who visit in person, sit a while, and truly see how your loved one is.</p>
              </div>
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg></span>
                <h3>It knows your family</h3>
                <p>The names, the history, what matters — so every answer feels like it already understands.</p>
              </div>
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></span>
                <h3>It never replaces you</h3>
                <p>It holds the space between your visits — and hands it right back the moment you&rsquo;re there.</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 5 · INTERACTIVE PREVIEW */}
        <section className="cx-section cx-wrap" id="preview" aria-labelledby="cx-prev-h">
          <div className="cx-preview">
            <Reveal>
              <div className="cx-previewcopy">
                <p className="cx-eyebrow">A glimpse</p>
                <h2 id="cx-prev-h">Ask what a worried heart asks.</h2>
                <p>No forms. No jargon. Just a question, and an answer that sounds like someone who cares. Tap one to feel it.</p>
              </div>
            </Reveal>
            <Reveal>
              <AskPreview />
            </Reveal>
          </div>
        </section>

        {/* 6 · FOUNDING 1,000 */}
        <section className="cx-section cx-wrap cx-founding" id="founding" aria-labelledby="cx-found-h">
          <Reveal>
            <div className="cx-foundingcard">
              <div className="cx-fglow" aria-hidden="true" />
              <p className="cx-eyebrow cx-center">Founding 1,000</p>
              <h2 id="cx-found-h">{cfg.founding.headline}</h2>
              <p className="cx-fp">{cfg.founding.body}</p>
              <FoundingForm cta={cfg.founding.cta} note={cfg.founding.note} handoff={cfg.handoff} />
            </div>
          </Reveal>
        </section>

        {/* 7 · FAQ */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-faq-h">
          <Reveal>
            <div className="cx-head cx-center">
              <p className="cx-eyebrow cx-center">Good to know</p>
              <h2 id="cx-faq-h">Questions, answered plainly.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-faq">
              <details><summary>Is this only for elderly parents?</summary><div className="cx-ans">No. Close Eye Connect is for anyone you love and can&rsquo;t always be near — a parent, a grandparent, a child, a whole family across cities or countries.</div></details>
              <details><summary>Is it a chatbot?</summary><div className="cx-ans">No. It&rsquo;s real people who look in on your loved ones, and a caring intelligence that helps you stay close. Never a script, never a bot pretending to be human.</div></details>
              <details><summary>Where can I use it?</summary><div className="cx-ans">We&rsquo;re launching in India and opening to families around the world. Wherever you are, we help you stay close to home.</div></details>
              <details><summary>Is my family&rsquo;s information safe?</summary><div className="cx-ans">Trust is the entire point. Nothing is shared without your consent, and your family&rsquo;s details always stay yours.</div></details>
              <details><summary>What does it cost?</summary><div className="cx-ans">Founding families receive founding pricing, shared clearly before you ever commit. Today, there&rsquo;s nothing to pay — just your place, held.</div></details>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="cx-footer">
        <div className="cx-wrap">
          <div className="cx-footgrid">
            <div className="cx-footbrand">
              <span className="cx-brand"><Mark size={28} /> <b>Close&nbsp;Eye</b></span>
              <p>A calm presence for the people you love.</p>
            </div>
            <nav className="cx-footlinks" aria-label="Footer">
              <a href="#preview">How it feels</a>
              <a href="#founding">Founding 1,000</a>
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
