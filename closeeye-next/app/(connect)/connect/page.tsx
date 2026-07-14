import Image from 'next/image'
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
  const primaryCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your family’s place'
  const navCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your place'

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
            <a className="cx-btn cx-btn-primary" href="#founding">{primaryCta}</a>
            <a className="cx-btn cx-btn-ghost" href="#preview">See how it feels</a>
          </div>
          <p className="cx-heronote">No payment today. Just your family&rsquo;s place, held.</p>
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

        {/* 4 · HOW IT WORKS */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-how-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">How it works</p>
              <h2 id="cx-how-h">Staying close, in three steps.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-how">
              <ol className="cx-steps">
                <li className="cx-step"><span className="cx-num" aria-hidden="true">1</span><div><h3>Tell us who you love</h3><p>Add the people you want to stay close to, and what matters most to them.</p></div></li>
                <li className="cx-step"><span className="cx-num" aria-hidden="true">2</span><div><h3>A Guardian looks in</h3><p>A real, verified Guardian visits in person — and truly sees how they are.</p></div></li>
                <li className="cx-step"><span className="cx-num" aria-hidden="true">3</span><div><h3>Stay close, always</h3><p>Get gentle updates, ask anything, and feel their presence between every visit.</p></div></li>
              </ol>
              <div className="cx-figure">
                <Image src="/connect/guardian-arriving.png" alt="A Close Eye Guardian arriving at a family’s home with flowers" fill sizes="(max-width: 880px) 90vw, 46vw" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* 5 · THE HUMAN NETWORK */}
        <section className="cx-section cx-wrap cx-divider" aria-labelledby="cx-net-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">The people behind the calm</p>
              <h2 id="cx-net-h">Real people, looking out for the ones you love.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-network">
              <article className="cx-person">
                <div className="cx-photo"><Image src="/connect/guardian-companion.png" alt="A Close Eye Guardian sitting with an elderly woman, looking through a photo album together" fill sizes="(max-width: 760px) 90vw, 46vw" /></div>
                <div className="cx-pbody">
                  <span className="cx-role">Your Guardian</span>
                  <h3>The one who shows up</h3>
                  <p>A caring companion who visits in person — sits a while, checks in, and notices what a video call never could.</p>
                  <span className="cx-verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg> Background-verified &amp; trained</span>
                </div>
              </article>
              <article className="cx-person">
                <div className="cx-photo"><Image src="/connect/human-videocall.png" alt="A Close Eye Guardian with an elder on a video call with their distant family" fill sizes="(max-width: 760px) 90vw, 46vw" /></div>
                <div className="cx-pbody">
                  <span className="cx-role">Your Presence Manager</span>
                  <h3>The one who holds it together</h3>
                  <p>A single, named person who oversees your family’s care, coordinates every visit, and is your point of contact whenever you need one.</p>
                  <span className="cx-verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> Your dedicated point of contact</span>
                </div>
              </article>
            </div>
          </Reveal>
        </section>

        {/* 6 · WHY DIFFERENT */}
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

        {/* 7 · INTERACTIVE PREVIEW */}
        <section className="cx-section cx-wrap cx-divider" id="preview" aria-labelledby="cx-prev-h">
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

        {/* 8 · SEE IT IN THE APP */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-app-h">
          <div className="cx-app">
            <Reveal>
              <div className="cx-appcopy">
                <p className="cx-eyebrow">In your hand</p>
                <h2 id="cx-app-h">The whole family, gently in the loop.</h2>
                <p>One calm home for everything — visits, updates, reports, and Ask Close Eye. Open it from anywhere in the world and feel how they&rsquo;re doing, today.</p>
              </div>
            </Reveal>
            <Reveal>
              <div className="cx-phone">
                <Image src="/connect/app-home.png" alt="The Close Eye app home screen showing a family’s dashboard" fill sizes="(max-width: 860px) 74vw, 290px" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 9 · TRUST & SAFETY */}
        <section className="cx-section cx-wrap cx-divider" aria-labelledby="cx-trust-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">Built on trust</p>
              <h2 id="cx-trust-h">The safeguards that let you exhale.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-trust">
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></span>
                <h3>Verified Guardians</h3>
                <p>Every Guardian is background-checked, trained, and ID-badged before they ever meet your family.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                <h3>Your privacy, protected</h3>
                <p>Consent-first, always. Your family&rsquo;s information stays yours — shared with no one without your say.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <h3>When minutes matter</h3>
                <p>A real emergency path — our team and the right responders — the moment something isn&rsquo;t right.</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 10 · FOUNDING / RESERVE */}
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

        {/* 11 · FAQ */}
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
