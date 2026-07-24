'use client'

/**
 * The Connect sheet — the orb's concierge (founder-approved 2026-07-21).
 *
 * The orb isn't a search box; it's a concierge. You ASK, or you ask it to HELP with something —
 * and what it offers is DERIVED from where the loved one is, using the engine's coverage policy
 * (lib/platform/service-region). Intelligence is global; Financial help is all-India (remote);
 * a real visit is served-metro only (Hyderabad today). It never promises what it can't deliver
 * there: an out-of-area or not-yet-built action is honestly deferred, always with the remote
 * alternative and a real "notify me" that records genuine demand (lib/db/concierge → waitlist).
 *
 * Presence: a small Close Eye orb (echoing the dock orb, gently breathing) + a warm line naming
 * who it knows. Suggestions, the Continue card, and coverage are ONLY from real family + history
 * data — never invented.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Clock, ChevronRight, ChevronLeft, UserPlus, Landmark, HeartHandshake, Sparkles, Bell, Check, Loader2 } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAskHistory, type AskHistoryItem } from '@/lib/db/ask'
import { recordConciergeSignal, type ConciergeIntent } from '@/lib/db/concierge'
import { presenceFor, isIndia, regionFor, type PresenceAvailability } from '@/lib/platform/service-region'
import { titleCase } from '@/lib/family/relationship-words'
import { BOOKING_SERVICES } from '@/features/booking/schema'
import type { LovedOne } from '@/lib/db/types'

/* Canonical prices — quoted from the exact source the booking flow charges from; never re-typed. */
const svc = (id: string) => BOOKING_SERVICES.find((s) => s.id === id)
const VISIT_PRICE = svc('home-wellbeing-visit')?.priceFrom ?? '₹1,000'
const HOSPITAL_PRICE = svc('hospital-companion')?.priceFrom ?? '₹2,000'
const CUSTOM_PRICE = svc('custom-request')?.priceFrom ?? '₹1,000'

/** Display name for the warm header/actions: "Your Mother" → "Mother"; a real name → its first word. */
function dispName(fullName?: string | null, relationship?: string | null): string {
  const f = (fullName || '').trim()
  if (/^your\s/i.test(f)) return titleCase(f.replace(/^your\s+/i, ''))
  return f.split(/\s+/)[0] || (relationship ? titleCase(relationship) : 'them')
}

type Domain = 'financial' | 'presence'

export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const { user } = useAuth()
  const { lovedOnes, profile, identity } = useFamilyData()
  const [q, setQ] = React.useState('')
  const [last, setLast] = React.useState<AskHistoryItem | null>(null)
  const [view, setView] = React.useState<{ domain: Domain; avail: PresenceAvailability } | null>(null)
  const [reqState, setReqState] = React.useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80)
      if (user) fetchAskHistory(user.id, 1).then((r) => setLast(r[0] ?? null)).catch(() => {})
      return () => window.clearTimeout(t)
    }
    setQ(''); setLast(null); setView(null); setReqState('idle')
  }, [open, user])

  function go(href: string) { onClose(); router.push(href) }
  function ask(text?: string) {
    const t = (text ?? q).trim()
    go(t ? `/space/connect?q=${encodeURIComponent(t)}` : '/space/connect')
  }

  // The concierge acts on the PRIMARY loved one (most families have one). Coverage is per their
  // location: an unknown location is NEVER treated as covered (service-region's golden rule).
  const lo: LovedOne | undefined = lovedOnes[0]
  const name = lo ? dispName(lo.full_name, lo.relationship) : ''
  const city = (lo?.city || '').trim()
  const region = lo?.region_code || ''
  const hasLoc = !!(city || region)
  const inIndia = isIndia(city) || region === 'IN'
  const financialAvail: PresenceAvailability = inIndia ? 'available' : hasLoc ? 'unavailable' : 'unknown'
  const presenceAvail: PresenceAvailability = city ? presenceFor(city) : 'unknown'
  const metro = ((city && regionFor(city)?.name) || 'Hyderabad').replace(/\s*Metro$/i, '')
  const cityLabel = city || 'your area'

  const names = lovedOnes.map((l) => dispName(l.full_name, l.relationship))
  const suffix = names.length === 1 ? ` about ${names[0]}` : names.length === 2 ? ` about ${names[0]} and ${names[1]}` : ''
  const title = `How can I help${suffix}?`

  const lastName = last?.lovedOneId ? (lovedOnes.find((l) => l.id === last.lovedOneId)?.full_name || '').trim().split(/\s+/)[0] : ''

  async function submitCare(intent: ConciergeIntent) {
    if (!view || reqState === 'busy') return
    setReqState('busy')
    const { error } = await recordConciergeSignal({
      action: view.domain === 'financial' ? 'Financial coordination' : 'A visit',
      city, region,
      intent,
      userName: identity.fullName,
      userEmail: user?.email || '',
      phone: profile?.phone || lo?.phone_number || null,
    })
    setReqState(error ? 'error' : 'done')
  }

  // ── Care detail view (in-sheet navigation) ──
  function openCare(domain: Domain, avail: PresenceAvailability) {
    if (avail === 'unknown') { go(lo ? `/space/people/${lo.id}/add` : '/space/people/add'); return } // need a city first
    setReqState('idle'); setView({ domain, avail })
  }

  /** An on-the-ground service row: covered → the real booking flow; not yet → the honest
   *  coverage detail (request / notify-me), exactly the concierge's existing truth rules. */
  function openGround(bookHref: string) {
    if (presenceAvail === 'available') go(bookHref)
    else openCare('presence', presenceAvail)
  }
  /** A coordination (remote, all-India) row: covered → the concierge conversation; not yet →
   *  the honest financial coverage detail. */
  function openCoordination(seed: string) {
    if (financialAvail === 'available' || !lo) ask(seed)
    else openCare('financial', financialAvail)
  }

  return (
    <Overlay open={open} onClose={onClose} chrome>
      {view ? (
        <CareDetail
          domain={view.domain}
          avail={view.avail}
          name={name}
          metro={metro}
          cityLabel={cityLabel}
          reqState={reqState}
          onBack={() => { setView(null); setReqState('idle') }}
          onSubmit={submitCare}
        />
      ) : (
        <div className="p-5 pb-7">
          {/* Presence */}
          <div className="mb-5 flex flex-col items-center text-center">
            <motion.div
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="grid h-12 w-12 place-items-center rounded-full bg-surface-inverse shadow-md"
            >
              <span aria-hidden className="ce-orb-core h-2.5 w-2.5" />
            </motion.div>
            <h2 className="mt-3 text-h4 text-content">{title}</h2>
          </div>

          {/* Continue — resume the last thread (only with real history) */}
          {last && (
            <button type="button" onClick={() => go('/space/connect')} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface p-3.5 text-start transition-colors hover:border-brand/40">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><Clock className="h-4 w-4" strokeWidth={1.75} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-content">Continue{lastName ? ` about ${lastName}` : ' your conversation'}</span>
                <span className="block truncate text-caption text-content-muted">“{last.question}”</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
            </button>
          )}

          {/* Ask — seeds the real engine */}
          <div className="wsp-askfield">
            <label htmlFor="orb-ask" className="sr-only">Ask about your family</label>
            <input
              ref={inputRef} id="orb-ask" value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
              placeholder="Ask, or ask me to help…" enterKeyHint="send" autoComplete="off"
            />
            <button type="button" onClick={() => ask()} aria-label="Ask" disabled={!q.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-30">
              <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          {!lo && (
            <button type="button" onClick={() => go('/space/people/add')} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-edge p-3.5 text-start transition-colors hover:border-brand/40">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><UserPlus className="h-4 w-4" strokeWidth={2} /></span>
              <span className="min-w-0"><span className="block text-body-sm font-semibold text-content">Add someone you love</span><span className="block text-caption text-content-muted">Then Close Eye can begin</span></span>
            </button>
          )}

          {/* The catalogue — moved here from Home (founder-approved Journey mockup, 2026-07-24):
              a catalogue answers "What do I need?", which is Connect's question. Every row keeps
              the concierge's coverage truth: covered → the real flow; not yet → the honest
              request/notify-me detail. Prices come from the booking schema, never re-typed. */}
          <p className="mb-2 mt-5 px-1 text-caption font-semibold uppercase tracking-wider text-content-muted">Everything we can arrange</p>
          <div className="flex flex-col gap-2">
            <CatRow em="🫶" title="Visits & wellbeing" sub="Check-ins, companionship" price={`From ${VISIT_PRICE}`} onClick={() => openGround('/space/book?service=home-wellbeing-visit')} />
            <CatRow em="🩺" title="Hospital days" sub="Someone beside them" price={`From ${HOSPITAL_PRICE}`} onClick={() => openGround('/space/book?service=hospital-companion')} />
            <CatRow em="📄" title="Paperwork & taxes" sub="Banking, documents, filing" price="Quote first" onClick={() => openCoordination('How can Close Eye help with paperwork and taxes?')} />
            <CatRow em="⚖️" title="Lawyers & property" sub="Coordination, verification" price="Quote first" onClick={() => openCoordination('Can you help find a trusted lawyer near my family?')} />
            <CatRow em="🛍️" title="Groceries & errands" sub="Medicines, pickups" price={`From ${CUSTOM_PRICE}`} onClick={() => openGround('/space/book?service=custom-request')} />
            <CatRow em="✨" title="Plans & pricing" sub="Find what fits your family" dark onClick={() => go('/space/billing/plan')} />
          </div>
        </div>
      )}
    </Overlay>
  )
}

/** One catalogue row — emoji · title+sub · canonical price (the rev-2 mockup's row language). */
function CatRow({ em, title, sub, price, dark, onClick }: {
  em: string; title: string; sub: string; price?: string; dark?: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={dark
        ? 'flex w-full items-center gap-3 rounded-2xl bg-surface-inverse p-3.5 text-start shadow-sm transition-opacity hover:opacity-90'
        : 'flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface p-3.5 text-start transition-colors hover:border-brand/40'}
    >
      <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-body ${dark ? 'bg-brand/40' : 'bg-surface-accent'}`}>{em}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-body-sm font-semibold ${dark ? 'text-content-inverse' : 'text-content'}`}>{title}</span>
        <span className={`block truncate text-caption ${dark ? 'text-content-inverse/70' : 'text-content-muted'}`}>{sub}</span>
      </span>
      {price
        ? <span className={`shrink-0 text-caption font-bold ${dark ? 'text-content-inverse/85' : 'text-brand'}`}>{price}</span>
        : <ChevronRight className={`h-4 w-4 shrink-0 ${dark ? 'text-content-inverse/70' : 'text-content-muted'}`} strokeWidth={1.75} />}
    </button>
  )
}

/** The honest Care detail — request where we can act, notify where we can't yet; never faked. */
function CareDetail({ domain, avail, name, metro, cityLabel, reqState, onBack, onSubmit }: {
  domain: Domain; avail: PresenceAvailability; name: string; metro: string; cityLabel: string
  reqState: 'idle' | 'busy' | 'done' | 'error'
  onBack: () => void; onSubmit: (intent: ConciergeIntent) => void
}) {
  const available = avail === 'available'
  const heading = domain === 'financial' ? 'Financial coordination' : `Someone to check on ${name}`
  const Icon = domain === 'financial' ? Landmark : HeartHandshake

  const body = domain === 'financial'
    ? (available
        ? `Close Eye organises ${name}’s tax filing, audits, valuations and paperwork — and brings in the right professional. It never gives the advice itself.`
        : `Financial coordination is handled remotely, right across India. ${name} is outside that today, so it isn’t something I can arrange there yet — but I’ll tell you the moment we can.`)
    : (available
        ? `A familiar face from Close Eye can visit ${name} — sit a while, share tea, and tell you honestly how ${name} is doing.`
        : `Our companions are in ${metro} today. ${name} is in ${cityLabel}, so a visit isn’t something I can arrange there yet — I’ll tell you the moment we reach ${cityLabel}.`)

  const intent: ConciergeIntent = available ? 'requested' : 'notify'
  const cta = available
    ? (domain === 'financial' ? 'Request financial help' : 'Request a visit')
    : `Tell me when it reaches ${cityLabel}`
  const doneMsg = available
    ? 'Done. A real person from Close Eye will reach you — you won’t have to explain it twice.'
    : `I’ll tell you the moment we reach ${cityLabel}.`

  return (
    <div className="p-5 pb-7">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-caption font-semibold text-content-muted hover:text-content">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Back
      </button>

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-accent text-brand"><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <h2 className="text-h4 text-content">{heading}</h2>
          <span className={`inline-flex items-center gap-1 text-caption font-semibold ${available ? 'text-brand' : 'text-content-muted'}`}>
            {available ? <><span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> Available {domain === 'financial' ? 'across India' : `in ${metro}`}</> : `Coming to ${cityLabel}`}
          </span>
        </div>
      </div>

      <p className="mt-4 text-body-sm leading-relaxed text-content-muted">{body}</p>

      {reqState === 'done' ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-surface-accent/60 p-4">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-content-inverse"><Check className="h-4 w-4" strokeWidth={2.4} /></span>
          <p className="text-body-sm font-medium text-content">{doneMsg}</p>
        </div>
      ) : (
        <>
          {!available && (
            <p className="mt-4 rounded-2xl bg-surface-accent/40 px-4 py-3 text-caption leading-relaxed text-content">
              Meanwhile, whatever’s remote — {domain === 'presence' ? 'financial help, ' : ''}questions, reminders — I can still help with, and I’ll keep understanding {name} wherever {name} is.
            </p>
          )}
          <button type="button" onClick={() => onSubmit(intent)} disabled={reqState === 'busy'} className="mt-5 inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60">
            {reqState === 'busy' ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Sending…</>
              : available ? <><Sparkles className="h-4 w-4" strokeWidth={2} /> {cta}</>
              : <><Bell className="h-4 w-4" strokeWidth={2} /> {cta}</>}
          </button>
          {reqState === 'error' && <p className="mt-2.5 text-center text-caption text-error">We couldn’t send that just now — please try again.</p>}
        </>
      )}
    </div>
  )
}
