import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowLeft, Loader2, ArrowRight, Globe, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { loadRazorpayScript } from '@/lib/razorpay'
import { Logo } from '@/components/ui/Logo'

// NOTE: ~25% pricing gap — ₹1,500 ≈ $18 at current rates; $22 covers PayPal fees + currency risk.
// Revisit if exchange rates shift significantly.
const PAYPAL_MEMBERSHIP_URL = 'https://www.paypal.com/ncp/payment/Z7U8QFAJ3TW9G'
// TODO: PayPal Subscriptions can replace this later

type Region   = 'india' | 'nri' | null
type PayState = 'idle' | 'creating' | 'verifying' | 'success' | 'error'
type SuccessVia = 'razorpay' | 'paypal'

const PERKS = [
  'Founding Family status & permanent number',
  'Personalised Ask Close Eye for your parent',
  'Priority when we set up visits',
  'Your whole family covered',
]

// ── Verifying overlay ─────────────────────────────────────────────────────────

function VerifyingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'var(--cream)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        border: '4px solid rgba(168,213,181,.3)',
        borderTopColor: 'var(--sage-2)',
        animation: 'fmc-spin 1s linear infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)', margin: '0 0 5px' }}>
          Setting up your plan…
        </p>
        <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: 0 }}>
          Activating your founding membership securely.
        </p>
      </div>
      <style>{`@keyframes fmc-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ via }: { via: SuccessVia }) {
  const navigate = useNavigate()
  const isPaypal = via === 'paypal'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '0 20px 60px',
    }}>
      <nav style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'var(--forest)', fontWeight: 700, fontSize: 15 }}>
          <Logo className="w-7 h-7" /> Close Eye
        </Link>
      </nav>

      <div style={{ width: '100%', maxWidth: 480, marginTop: 24, textAlign: 'center' }}>

        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eaf5ee', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4 10-10" stroke="#2c6b43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--forest)', margin: '0 0 6px', lineHeight: 1.1 }}>
          {isPaypal ? 'Payment started!' : "You're a Founding Family"}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 22px', lineHeight: 1.55 }}>
          {isPaypal
            ? 'Complete your payment in the PayPal tab that just opened. We\'ll reach out on WhatsApp once we confirm receipt.'
            : 'Welcome to Close Eye. Your plan is activating — you\'ll receive WhatsApp confirmation shortly.'}
        </p>

        <div style={{ background: '#fff', border: '1px solid var(--gray-light)', borderRadius: 16, padding: '16px 18px', textAlign: 'left', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--gray-mid)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            What happens next
          </p>
          {[
            isPaypal
              ? 'Finish payment in the PayPal tab — it should already be open.'
              : 'Your companion plan activates within a few minutes.',
            "Our care team reaches out within 24–48 hours to set up your parent's visits.",
            "You'll get a WhatsApp report after every visit, within one hour.",
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#243831', padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(14,42,31,.06)' : 'none' }}>
              <span style={{ fontWeight: 700, color: 'var(--forest)', flexShrink: 0 }}>{i + 1}.</span>
              {item}
            </div>
          ))}
        </div>

        {isPaypal && (
          <a
            href={PAYPAL_MEMBERSHIP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', background: '#0070BA', color: '#fff',
              border: 0, borderRadius: 14, padding: '14px 20px', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10,
              textDecoration: 'none', boxSizing: 'border-box',
            }}
          >
            Open PayPal again →
          </a>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: '100%', background: isPaypal ? 'var(--cream)' : 'var(--forest)',
            color: isPaypal ? 'var(--forest)' : '#FAF7F2',
            border: isPaypal ? '1.5px solid rgba(14,42,31,0.18)' : '0',
            borderRadius: 14, padding: '15px', fontFamily: 'inherit',
            fontWeight: 800, fontSize: 16, cursor: 'pointer', marginBottom: 14, minHeight: 52,
          }}
        >
          Go to my dashboard
        </button>

        <p style={{ fontSize: 13, color: 'var(--sage-2)', fontStyle: 'italic', fontWeight: 600 }}>
          Your Trusted Presence in India.
        </p>
      </div>
    </div>
  )
}

// ── Checkout confirmation page ────────────────────────────────────────────────

export function FoundingMemberCheckoutPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [region,     setRegion]     = useState<Region>(null)
  const [payState,   setPayState]   = useState<PayState>('idle')
  const [successVia, setSuccessVia] = useState<SuccessVia | null>(null)
  const [errMsg,     setErrMsg]     = useState<string | null>(null)
  const [elderName,  setElderName]  = useState<string | null>(null)

  // Auth guard — unauthenticated users get sent to sign in first, then return here
  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'membership' }))
      navigate('/auth?mode=signup', { replace: true })
    }
  }, [loading, user, navigate])

  // Load first loved one's name for personal context ("Set up Amma's care")
  useEffect(() => {
    if (!user) return
    supabase.from('loved_ones')
      .select('full_name').eq('family_user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setElderName(data.full_name.split(' ')[0]) })
  }, [user])

  async function handleIndiaPay() {
    setErrMsg(null)
    setPayState('creating')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-subscription', {
        body: { plan_id: 'companion' },
      })
      if (fnErr || !data?.subscription_id) throw new Error(data?.error || 'Could not start checkout.')

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')

      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Close Eye',
        description: 'CloseEye Companion — ₹1,500/month',
        image: '/ce-logo.png',
        theme: { color: '#0E2A1F' },
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
          contact: profile?.whatsapp_number || '',
        },
        handler: async (response: { razorpay_subscription_id: string }) => {
          setPayState('verifying')
          await supabase.from('subscriptions')
            .update({ status: 'authenticated' })
            .eq('razorpay_subscription_id', response.razorpay_subscription_id)
          setSuccessVia('razorpay')
          setPayState('success')
        },
        modal: {
          ondismiss: () => setPayState('idle'),
          backdropclose: false,
        },
      })
      rzp.open()
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPayState('error')
    }
  }

  function handleNriPay() {
    // window.open triggers PayPal in a new tab; state update shows confirmation on this page.
    window.open(PAYPAL_MEMBERSHIP_URL, '_blank', 'noopener,noreferrer')
    setSuccessVia('paypal')
    setPayState('success')
  }

  // ── Overlay / success states ──────────────────────────────────────────────
  if (payState === 'verifying') return <VerifyingScreen />
  if (payState === 'success' && successVia) return <SuccessScreen via={successVia} />
  if (loading || !user) return null

  const isBusy      = payState === 'creating'
  const parentLabel = elderName ? `${elderName}'s` : "your parent's"
  const firstName   = profile?.full_name?.split(' ')[0]

  // ── Confirmation screen ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'inherit' }}>
      <style>{`@keyframes fmc-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Slim nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'env(safe-area-inset-top, 0px) 20px 0',
        height: 'calc(56px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid rgba(14,42,31,0.07)',
        background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'var(--forest)', fontWeight: 700, fontSize: 15 }}>
          <Logo className="w-6 h-6" /> Close Eye
        </Link>
        <Link
          to="/founding-member"
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--gray-mid)', textDecoration: 'none', fontWeight: 500 }}
        >
          <ArrowLeft size={14} /> Back
        </Link>
      </nav>

      {/* Page content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Breadcrumb */}
        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '0 0 20px', fontWeight: 500 }}>
          {firstName ? `Signed in as ${firstName}` : 'Founding Family'} · Before 15 August
        </p>

        {/* Headline */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--forest)', margin: '0 0 6px', lineHeight: 1.2 }}>
          Set up {parentLabel} care
        </h1>
        <p style={{ fontSize: 15, color: 'var(--gray-mid)', margin: '0 0 28px', lineHeight: 1.5 }}>
          Begin as a Founding Family — covers your whole family.
        </p>

        {/* ── Benefits card ────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(14,42,31,0.10)',
          borderRadius: 18,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--gray-mid)', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Founding Family — What you get
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PERKS.map((perk, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 0',
                borderBottom: i < PERKS.length - 1 ? '1px solid rgba(14,42,31,0.05)' : 'none',
                fontSize: 14, color: '#243831', lineHeight: 1.45,
              }}>
                <span style={{
                  flexShrink: 0, marginTop: 1,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(47,168,79,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} color="#2FA84F" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Where will you be paying from? ──────────────────────────────── */}
        <p style={{
          fontSize: 12, fontWeight: 700, color: 'var(--gray-mid)',
          textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 12px',
        }}>
          Where will you be paying from?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── NRI / Abroad card — HERO ────────────────────────────────────── */}
          <button
            onClick={() => { setRegion('nri'); setErrMsg(null) }}
            style={{
              background: region === 'nri' ? '#0A1F14' : 'var(--forest)',
              border: `2px solid ${region === 'nri' ? 'var(--sage)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 20, padding: '22px 20px', cursor: 'pointer',
              color: '#fff', textAlign: 'left', fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <Globe size={13} /> Abroad (NRI)
              </span>
              {region === 'nri' && (
                <span style={{ fontSize: 11, background: 'rgba(168,213,181,0.2)', border: '1px solid var(--sage)', color: 'var(--sage)', padding: '2px 10px', borderRadius: 100, fontWeight: 700 }}>
                  Selected
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--sage)', lineHeight: 1 }}>$22</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>first month</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '6px 0 0', lineHeight: 1.5 }}>
              Pay via PayPal · We'll send your renewal link each month.
            </p>
          </button>

          {/* ── India card — QUIETER ─────────────────────────────────────────── */}
          <button
            onClick={() => { setRegion('india'); setErrMsg(null) }}
            style={{
              background: region === 'india' ? '#fff' : '#faf9f7',
              border: `2px solid ${region === 'india' ? 'var(--forest)' : 'rgba(14,42,31,0.13)'}`,
              borderRadius: 18, padding: '18px 20px', cursor: 'pointer',
              color: 'var(--forest)', textAlign: 'left', fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <MapPin size={13} /> India
              </span>
              {region === 'india' && (
                <span style={{ fontSize: 11, background: 'rgba(14,42,31,0.08)', color: 'var(--forest)', padding: '2px 10px', borderRadius: 100, fontWeight: 700 }}>
                  Selected
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 2px' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--forest)', lineHeight: 1 }}>₹1,500</span>
              <span style={{ fontSize: 13, color: 'var(--gray-mid)', fontWeight: 500 }}>/month</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '4px 0 0' }}>
              Auto-renews via Razorpay · Manage in dashboard
            </p>
          </button>
        </div>

        {/* ── CTA based on selection ───────────────────────────────────────── */}
        {region === 'india' && (
          <button
            onClick={handleIndiaPay}
            disabled={isBusy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', marginTop: 16,
              background: isBusy ? 'rgba(14,42,31,0.5)' : 'var(--forest)',
              color: '#FAF7F2', border: 0, borderRadius: 14,
              padding: '15px 20px', fontFamily: 'inherit', fontWeight: 800,
              fontSize: 16, cursor: isBusy ? 'not-allowed' : 'pointer',
              minHeight: 52, transition: 'background 0.15s',
            }}
          >
            {isBusy
              ? <><Loader2 size={18} style={{ animation: 'fmc-spin 1s linear infinite' }} /> Starting…</>
              : <>Subscribe ₹1,500/month · Razorpay <ArrowRight size={18} /></>
            }
          </button>
        )}

        {region === 'nri' && (
          <button
            onClick={handleNriPay}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', marginTop: 16,
              background: '#0070BA',
              color: '#fff', borderRadius: 14, border: 0,
              padding: '15px 20px', fontFamily: 'inherit', fontWeight: 800,
              fontSize: 16, cursor: 'pointer', minHeight: 52,
            }}
          >
            Pay $22 · PayPal <ArrowRight size={18} />
          </button>
        )}

        {/* Trust line */}
        {region && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
              {region === 'india'
                ? 'Secure subscription by Razorpay · Cancel anytime'
                : 'PayPal · One-time charge · No auto-billing'}
            </span>
          </div>
        )}

        {/* Error state */}
        {errMsg && (
          <div style={{
            marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 12, padding: '13px 16px', fontSize: 13, color: '#7f1d1d', lineHeight: 1.5,
          }}>
            {errMsg}
          </div>
        )}

        {/* Learn more link */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--gray-mid)' }}>
          Want to learn more first?{' '}
          <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>
            See founding membership details →
          </Link>
        </p>

        {/* Legal */}
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--gray-mid)', lineHeight: 1.6 }}>
          By paying you agree to our{' '}
          <Link to="/terms" style={{ color: 'var(--gray-mid)', textDecoration: 'underline' }}>Terms</Link>
          {' '}and{' '}
          <Link to="/refund-policy" style={{ color: 'var(--gray-mid)', textDecoration: 'underline' }}>Refund Policy</Link>.
          Founding benefits are permanent and not transferable.
        </p>

      </div>
    </div>
  )
}
