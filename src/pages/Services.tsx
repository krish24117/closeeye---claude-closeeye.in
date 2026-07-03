import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, ArrowRight, Siren, ShieldCheck, Clock, X, HeartHandshake, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { loadRazorpayScript } from '@/lib/razorpay'
import { ConsultationModal } from '@/components/ConsultationModal'
import { CustomCareModal } from '@/components/CustomCareModal'
import { BookingDrawer } from '@/components/BookingDrawer'
import {
  MONTHLY_PLAN, ONE_OFF_SERVICES, MEMBERSHIP_PAISE,
  paiseToUsdApprox, type ServiceItem,
} from '@/lib/services-catalog'

// Maps services-catalog IDs → BookService wizard route IDs
const SERVICE_WIZARD_ID: Record<string, string> = {
  grocery_medicine:    'grocery_medicine_assistance',
  emergency_response:  'emergency_support_visit',
}

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const EMERGENCY_WA = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('EMERGENCY — I need urgent help for my parent in Hyderabad.')}`
const EMERGENCY_TEL = `tel:+${WA_NUMBER}`

export function ServicesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const profile_ = (profile as unknown) as Record<string, unknown>
  const isFoundingMember = !!profile_?.is_founding_member
  const foundingNumber   = profile_?.founding_number as number | undefined

  const [busy, setBusy] = useState<'sub' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drawerService, setDrawerService] = useState<ServiceItem | null>(null)
  const [upsellFor, setUpsellFor] = useState<string | null>(null)
  const [consultOpen, setConsultOpen] = useState(false)
  const [customCareOpen, setCustomCareOpen] = useState(false)

  // RUNG 2 — recurring subscription (existing server-verified flow)
  async function handleSubscribe() {
    setError(null)
    if (!user || profile?.role !== 'family') {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'subscription', planId: MONTHLY_PLAN.planId }))
      navigate('/auth?mode=signup')
      return
    }
    setBusy('sub')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-subscription', {
        body: { plan_id: MONTHLY_PLAN.planId },
      })
      if (fnErr || !data?.subscription_id) throw new Error(data?.error || 'Failed to start checkout.')
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')
      // NOTE: source of truth is the server-side webhook (HMAC-verified). The
      // client handler only navigates; it never marks the subscription paid.
      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Close Eye',
        description: `${MONTHLY_PLAN.name} — ${MONTHLY_PLAN.priceLabel}/mo`,
        image: '/favicon.svg',
        theme: { color: '#0E2A1F' },
        prefill: { name: profile?.full_name || '', email: user?.email || '', contact: profile?.whatsapp_number || '' },
        handler: () => { setBusy(null); navigate('/dashboard/subscription') },
        modal: { ondismiss: () => setBusy(null), backdropclose: false },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(null)
    }
  }

  // RUNG 1 — founding membership, one-time ₹100 (server-verified)
  async function handleJoin() {
    setError(null)
    if (!user) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'membership' }))
      navigate('/auth?mode=signup')
      return
    }
    setBusy('join')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-membership', { body: {} })
      if (fnErr || !data?.order_id) throw new Error(data?.error || 'Could not start membership checkout.')
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')
      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: 'INR',
        name: 'Close Eye',
        description: 'Founding membership',
        image: '/favicon.svg',
        theme: { color: '#0E2A1F' },
        prefill: { name: profile?.full_name || '', email: user?.email || '', contact: profile?.whatsapp_number || '' },
        // Membership is marked paid ONLY after server-side signature verification.
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const { error: vErr } = await supabase.functions.invoke('razorpay-verify-membership', {
              body: {
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              },
            })
            if (vErr) { setError('Payment received — verifying took longer than expected. We will confirm by WhatsApp.'); return }
            navigate('/dashboard')
          } catch {
            setError('Payment received — verifying took longer than expected. We will confirm by WhatsApp.')
          } finally {
            setBusy(null)
          }
        },
        modal: { ondismiss: () => setBusy(null), backdropclose: false },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(null)
    }
  }

  // Resume a membership checkout if the user signed up and returned to /services.
  // (Auth's default post-signup redirect goes to the dashboard; wiring that to
  // resume membership would touch Auth.tsx, which is out of this branch's scope.)
  useEffect(() => {
    if (!user) return
    const raw = sessionStorage.getItem('pendingCheckout')
    if (!raw) return
    try {
      if (JSON.parse(raw)?.type === 'membership') {
        sessionStorage.removeItem('pendingCheckout')
        handleJoin()
      }
    } catch { /* ignore malformed */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function handleCta(s: ServiceItem) {
    if (s.type === 'emergency') { window.open(EMERGENCY_WA, '_blank', 'noopener'); return }
    // Hospital assistance has variants — open picker drawer, then navigate to wizard
    if (s.variants) { setDrawerService(s); return }
    // All other one-off services → navigate to step-by-step booking wizard
    if (!user) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'booking', serviceType: SERVICE_WIZARD_ID[s.id] ?? s.id }))
      navigate('/auth?mode=signup')
      return
    }
    navigate(`/dashboard/book/${SERVICE_WIZARD_ID[s.id] ?? s.id}`)
  }

  function handleVariantNavigate(wizardId: string) {
    setDrawerService(null)
    if (!user) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'booking', serviceType: wizardId }))
      navigate('/auth?mode=signup')
      return
    }
    navigate(`/dashboard/book/${wizardId}`)
  }

  return (
    <main className="ce-pricing-page">
      {/* Heading */}
      <header className="ce-pp-head">
        <h1 className="ce-pp-h1">Care for your parents, whatever the distance</h1>
        <p className="ce-pp-sub">Prices are the same for everyone. All amounts are billed in INR.</p>
      </header>

      {error && <div className="ce-pp-error" role="alert">{error}</div>}

      {/* Post-booking upsell */}
      {upsellFor && (
        <div className="ce-upsell-banner" role="status">
          <div>
            <strong>Request sent for {upsellFor}.</strong> Families on the Monthly Plan get this visit included —
            plus weekly calls and a report every time — for ₹1,500/month.
          </div>
          <div className="ce-upsell-actions">
            <button className="ce-pp-btn ce-pp-btn-primary" onClick={handleSubscribe}>Start plan</button>
            <button className="ce-upsell-dismiss" aria-label="Dismiss" onClick={() => setUpsellFor(null)}><X size={18} /></button>
          </div>
        </div>
      )}

      {/* RUNG 1 — membership banner (conditional) */}
      {isFoundingMember ? (
        /* Existing member — show status, stop selling */
        <section className="ce-member-status">
          <div className="ce-member-status-icon">✓</div>
          <div className="ce-member-status-body">
            <p className="ce-member-status-title">
              Founding Family{foundingNumber ? ` #${foundingNumber}` : ''}
            </p>
            <p className="ce-member-status-perks">Benefits Active · Priority scheduling · Member pricing</p>
          </div>
          <button
            className="ce-member-status-manage"
            onClick={() => navigate('/dashboard/subscription')}
          >
            Manage
          </button>
        </section>
      ) : (
        /* Non-member — acquisition card */
        <section className="ce-fm-card">
          <div className="ce-fm-left">
            <span className="ce-fm-badge">Early Access</span>
            <h2 className="ce-fm-title">Become a Founding Family</h2>
            <p className="ce-fm-desc">
              Join the first families helping shape Close Eye. Lock in lifetime member pricing with one payment — no renewals.
            </p>
            <ul className="ce-fm-benefits">
              {[
                'Lifetime member pricing',
                'Priority access to new features',
                'Help shape Close Eye',
                'Exclusive Founding Family badge',
              ].map(b => (
                <li key={b}>
                  <span className="ce-fm-check"><Check size={9} strokeWidth={3.5} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="ce-fm-right">
            <div className="ce-fm-price-block">
              <span className="ce-fm-price">₹100</span>
              <span className="ce-fm-price-sub">one-time · no renewals</span>
            </div>
            <button className="ce-fm-cta" onClick={handleJoin} disabled={busy === 'join'}>
              {busy === 'join'
                ? <><Loader2 size={15} className="ce-spin" /> Starting…</>
                : 'Become a Founding Family'}
            </button>
            <p className="ce-fm-trust">Limited to the first founding families.</p>
          </div>
        </section>
      )}

      {/* RUNG 2 — featured monthly plan */}
      <section className="ce-rung2">
        <div className="ce-plan-card">
          <span className="ce-plan-badge">{MONTHLY_PLAN.badge}</span>
          <h2 className="ce-plan-name">{MONTHLY_PLAN.name}</h2>
          <p className="ce-plan-price">
            <span className="ce-plan-amount">{MONTHLY_PLAN.priceLabel}</span>
            <span className="ce-plan-period">{MONTHLY_PLAN.period}</span>
          </p>
          <p className="ce-plan-usd">{paiseToUsdApprox(MONTHLY_PLAN.amountPaise)}/mo · billed in INR</p>
          <ul className="ce-plan-bullets">
            {MONTHLY_PLAN.bullets.map(b => (
              <li key={b}><Check size={16} /> {b}</li>
            ))}
          </ul>
          <button className="ce-pp-btn ce-pp-btn-primary ce-pp-btn-full" onClick={handleSubscribe} disabled={busy === 'sub'}>
            {busy === 'sub' ? <><Loader2 size={16} className="ce-spin" /> Setting up…</> : <>Start plan <ArrowRight size={16} /></>}
          </button>
          <button className="ce-plan-talk" onClick={() => setConsultOpen(true)}>Prefer to talk first? Book a free call</button>
        </div>
      </section>

      {/* RUNG 3 — on-demand */}
      <section className="ce-rung3">
        <h2 className="ce-rung3-title">Or just need something once?</h2>
        <ul className="ce-od-list">
          {ONE_OFF_SERVICES.map(s => {
            const isEmergency = s.type === 'emergency'
            return (
              <li key={s.id} className="ce-od-row">
                <div className="ce-od-info">
                  <p className="ce-od-name">{s.name}</p>
                  <p className="ce-od-sub">{s.subLabel}</p>
                </div>
                <div className="ce-od-price">
                  <span className="ce-od-amount">{s.priceLabel}</span>
                  {s.amountPaise != null && <span className="ce-od-usd">{paiseToUsdApprox(s.amountPaise)}</span>}
                </div>
                <div className="ce-od-cta">
                  <button
                    className={`ce-pp-btn ${isEmergency ? 'ce-pp-btn-emergency' : 'ce-pp-btn-outline'}`}
                    onClick={() => handleCta(s)}
                  >
                    {isEmergency ? <><Siren size={15} /> Get help now</> : 'Book'}
                  </button>
                  {isEmergency && <a className="ce-od-tel" href={EMERGENCY_TEL}>or call +91 90002 21261</a>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Trust strip (refund line intentionally omitted per ops) */}
      <section className="ce-trust-strip">
        <span><ShieldCheck size={16} /> Verified companions</span>
        <span><Clock size={16} /> Report within the hour</span>
        <span><MessageCircle size={16} strokeWidth={2} /> Updates on WhatsApp</span>
      </section>

      <p className="ce-pp-foot">
        All prices in INR. USD shown is approximate. Payments are processed securely via Razorpay.
        Invoice provided for every transaction.
      </p>

      <BookingDrawer
        service={drawerService}
        onClose={() => setDrawerService(null)}
        onNavigate={handleVariantNavigate}
      />
      <ConsultationModal open={consultOpen} onClose={() => setConsultOpen(false)} interestedPlan={MONTHLY_PLAN.name} />

      {/* Custom Care — floating help button (opposite the WhatsApp button) */}
      <button
        type="button"
        className="ce-help-float"
        onClick={() => setCustomCareOpen(true)}
        aria-label="Custom care — request a quote for special needs"
      >
        <HeartHandshake size={20} /> <span>Custom care</span>
      </button>
      <CustomCareModal open={customCareOpen} onClose={() => setCustomCareOpen(false)} />
    </main>
  )
}
