import Image from 'next/image'
import { getLaunchMode, MODE_CONFIG } from '@/components/connect/config'
import { Logo } from '@/components/connect/mark'
import { SiteNav, Reveal, AskPreview, FoundingForm } from '@/components/connect/interactive'

/**
 * Close Eye Connect — the standalone launch page. Sells Connect-the-SKU (the
 * global intelligence layer), not the whole ecosystem: Care appears only as an
 * on-demand capability Connect activates, never the hero. Trust/family/memory
 * lead; the copy passes the "remove-AI test" (no AI / assistant / companion).
 * Server component; interactive pieces (nav, reveal, Ask, sign-up) are client.
 */
export default function ConnectPage() {
  const mode = getLaunchMode()
  const cfg = MODE_CONFIG[mode]
  const navCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your place'
  const heroCta = mode === 'closed_waitlist' ? 'Join the waitlist' : 'Reserve your family’s place'

  return (
    <>
      <SiteNav ctaLabel={navCta} />

      <main>
        {/* 1 · HERO — the promise: trust first, then family */}
        <section className="cx-hero cx-wrap" aria-labelledby="cx-hero-h">
          <div className="cx-glow" aria-hidden="true" />
          <span className="cx-pill"><span className="cx-dot" /> {cfg.pill}</span>
          <h1 id="cx-hero-h">Your family&rsquo;s trusted intelligence.</h1>
          <p className="cx-lead">Close&nbsp;Eye Connect — one place to remember, understand and support the people you love, from anywhere in the world.</p>
          <div className="cx-herocta">
            <a className="cx-btn cx-btn-primary" href="#founding">{heroCta}</a>
            <a className="cx-btn cx-btn-ghost" href="#how">See how it works</a>
          </div>
          <p className="cx-heronote">No payment today. Just your family&rsquo;s place, held.</p>
        </section>

        {/* 2 · THE QUIET WORRY */}
        <section className="cx-section cx-wrap cx-problem" aria-labelledby="cx-prob-h">
          <Reveal>
            <p className="cx-eyebrow">The quiet worry</p>
            <h2 id="cx-prob-h">You don&rsquo;t want a report. You want to know they&rsquo;re okay.</h2>
            <p className="cx-p">A parent in another city. A call you keep meaning to make. The small, constant not-knowing — <b>did they eat, are they well, are they lonely.</b> You&rsquo;d give anything to simply know, without having to ask.</p>
            <p className="cx-whisper">You shouldn&rsquo;t have to choose between your life and their care.</p>
          </Reveal>
        </section>

        {/* 3 · WHAT CONNECT IS — one place that knows your family */}
        <section className="cx-section cx-wrap cx-divider" id="what" aria-labelledby="cx-what-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">What it is</p>
              <h2 id="cx-what-h">One place that truly knows the people you love.</h2>
              <p>Close&nbsp;Eye Connect holds everything that matters about your family, learns what&rsquo;s normal for them, and stays with them every day — so you&rsquo;re never in the dark, and never caught off guard.</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-truths">
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg></span>
                <h3>It remembers</h3>
                <p>Every detail, every medicine, every story that matters — so nothing important ever slips.</p>
              </div>
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg></span>
                <h3>It understands</h3>
                <p>What&rsquo;s normal for them, what&rsquo;s changed, and when something quietly isn&rsquo;t right.</p>
              </div>
              <div className="cx-truth">
                <span className="cx-mk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></span>
                <h3>It&rsquo;s ready</h3>
                <p>The moment something&rsquo;s wrong, it acts — and can bring real help to their door.</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 3b · HOW IT WORKS — the Family Intelligence arc + a real photo */}
        <section className="cx-section cx-wrap cx-divider" id="how" aria-labelledby="cx-how-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">How it works</p>
              <h2 id="cx-how-h">Four quiet steps to never being in the dark.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-how">
              <ol className="cx-steps">
                <li className="cx-step"><span className="cx-num" aria-hidden="true">1</span><div><h3>Tell Close&nbsp;Eye about your family</h3><p>Who they are, what matters, the little things worth remembering.</p></div></li>
                <li className="cx-step"><span className="cx-num" aria-hidden="true">2</span><div><h3>It learns what&rsquo;s normal for them</h3><p>Their routines, their moods, the rhythm of their days.</p></div></li>
                <li className="cx-step"><span className="cx-num" aria-hidden="true">3</span><div><h3>Ask anything, anytime</h3><p>And get an answer that sounds like someone who truly knows them.</p></div></li>
                <li className="cx-step"><span className="cx-num" aria-hidden="true">4</span><div><h3>Real help arrives when it&rsquo;s needed</h3><p>The moment something&rsquo;s wrong, Close&nbsp;Eye Care is there in person.</p></div></li>
              </ol>
              <div className="cx-figure">
                <Image src="/connect/guardian-arriving.png" alt="A Close Eye Guardian arriving at an elder’s home, welcomed at the door" fill sizes="(max-width: 880px) 90vw, 44vw" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* 4 · FEEL IT — the Ask preview */}
        <section className="cx-section cx-wrap" id="preview" aria-labelledby="cx-prev-h">
          <div className="cx-preview">
            <Reveal>
              <div className="cx-previewcopy">
                <p className="cx-eyebrow">A glimpse</p>
                <h2 id="cx-prev-h">Ask anything about the people you love.</h2>
                <p>No forms. No jargon. Just a question, and an answer that sounds like someone who knows your family. Tap one to feel it.</p>
              </div>
            </Reveal>
            <Reveal>
              <AskPreview />
            </Reveal>
          </div>
        </section>

        {/* 5 · SEE IT IN THE APP */}
        <section className="cx-section cx-wrap cx-divider" aria-labelledby="cx-app-h">
          <div className="cx-app">
            <Reveal>
              <div className="cx-appcopy">
                <p className="cx-eyebrow">In your hand</p>
                <h2 id="cx-app-h">Your whole family, in one calm place.</h2>
                <p>Everything Close&nbsp;Eye Connect knows and does — visits, updates, memories, and answers — in one home you can open from anywhere in the world.</p>
              </div>
            </Reveal>
            <Reveal>
              <div className="cx-phone">
                <Image src="/connect/app-home.png" alt="The Close Eye app home screen showing a family’s dashboard" fill sizes="(max-width: 860px) 74vw, 290px" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6 · CARE — the on-demand human network Connect activates (NOT the hero) */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-care-h">
          <Reveal>
            <div className="cx-head">
              <p className="cx-eyebrow">One of the ways Connect helps</p>
              <h2 id="cx-care-h">And when someone truly needs to be there, Connect activates Close&nbsp;Eye Care.</h2>
              <p>Close&nbsp;Eye Connect understands, remembers and helps you stay close every day. And when someone truly needs a human beside them — a check-in, a hospital visit, an emergency — Connect activates <b>Close&nbsp;Eye Care</b>: a verified person in&nbsp;India, arranged for you. You never set it up — Connect does.</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-network">
              <article className="cx-person">
                <div className="cx-photo"><Image src="/connect/guardian-companion.png" alt="A Close Eye Guardian sitting with an elderly woman, looking through a photo album together" fill sizes="(max-width: 760px) 90vw, 46vw" /></div>
                <div className="cx-pbody">
                  <span className="cx-role">A Guardian</span>
                  <h3>Shows up in person</h3>
                  <p>A caring, verified companion who visits — and tells Connect what a screen never could.</p>
                  <span className="cx-verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg> Background-verified &amp; trained</span>
                </div>
              </article>
              <article className="cx-person">
                <div className="cx-photo"><Image src="/connect/human-videocall.png" alt="A Close Eye Guardian with an elder on a video call with their distant family" fill sizes="(max-width: 760px) 90vw, 46vw" /></div>
                <div className="cx-pbody">
                  <span className="cx-role">A Presence Manager</span>
                  <h3>Holds it together</h3>
                  <p>One named person who coordinates every Care visit and is there when you need a human.</p>
                  <span className="cx-verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> Your dedicated point of contact</span>
                </div>
              </article>
            </div>
          </Reveal>
        </section>

        {/* 7 · TRUST & SAFETY */}
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
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                <h3>Your family, kept private</h3>
                <p>Consent-first, always. What Close&nbsp;Eye knows about your family stays yours — shared with no one without your say.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <h3>Ready when minutes matter</h3>
                <p>The instant something looks wrong, Connect acts — and can dispatch the right real-world help without you lifting a finger.</p>
              </div>
              <div className="cx-trustitem">
                <span className="cx-tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></span>
                <h3>Only verified people</h3>
                <p>Every Guardian Care sends is background-checked, trained, and ID-badged before they ever meet your family.</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Brand line — the flagship tagline as a calm emotional beat */}
        <section className="cx-section cx-wrap cx-tagband" aria-label="Close Eye — when you can’t be there, Close Eye can">
          <Reveal>
            <p className="cx-tagline">When you can&rsquo;t be there, Close&nbsp;Eye can.</p>
          </Reveal>
        </section>

        {/* 8 · FOUNDING / RESERVE */}
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

        {/* 9 · FAQ */}
        <section className="cx-section cx-wrap" aria-labelledby="cx-faq-h">
          <Reveal>
            <div className="cx-head cx-center">
              <p className="cx-eyebrow cx-center">Good to know</p>
              <h2 id="cx-faq-h">Questions, answered plainly.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="cx-faq">
              <details><summary>What&rsquo;s the difference between Connect and Care?</summary><div className="cx-ans">Close&nbsp;Eye Connect is what stays with your family every day — remembering, understanding, always ready. Close&nbsp;Eye Care is the verified human network Connect activates when someone needs to be there in person.</div></details>
              <details><summary>Is this only for elderly parents?</summary><div className="cx-ans">No. Close&nbsp;Eye Connect is for anyone you love and can&rsquo;t always be near — a parent, a grandparent, a child, a whole family across cities or countries.</div></details>
              <details><summary>Where can I use it?</summary><div className="cx-ans">Connect is with you wherever you are in the world. When it calls for a real person, Close&nbsp;Eye Care sends someone in India, where our human network is today.</div></details>
              <details><summary>Is my family&rsquo;s information safe?</summary><div className="cx-ans">Trust is the entire point. Nothing is shared without your consent, and everything Close&nbsp;Eye knows about your family always stays yours.</div></details>
              <details><summary>What does it cost?</summary><div className="cx-ans">Founding families receive founding pricing, shared clearly before you ever commit. Today, there&rsquo;s nothing to pay — just your place, held.</div></details>
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
              <a href="#what">What it is</a>
              <a href="#how">How it works</a>
              <a href="#preview">A glimpse</a>
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
