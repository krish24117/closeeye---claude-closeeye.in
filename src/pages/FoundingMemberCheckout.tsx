import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowLeft, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { loadRazorpayScript } from '@/lib/razorpay'
import { Logo } from '@/components/ui/Logo'

type PayState = 'idle' | 'creating' | 'verifying' | 'success' | 'error'

const PERKS = [
  'Founding-member status & permanent number',
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
          Confirming your payment…
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

function SuccessScreen({ foundingNumber }: { foundingNumber: number }) {
  const navigate = useNavigate()
  const paddedNum = String(foundingNumber).padStart(4, '0')
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
          <Logo className="w-7 h-7" /> close eye
        </Link>
      </nav>

      <div style={{ width: '100%', maxWidth: 480, marginTop: 24, textAlign: 'center' }}>

        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eaf5ee', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4 10-10" stroke="#2c6b43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--forest)', margin: '0 0 6px', lineHeight: 1.1 }}>
          You're a Founding Member
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 14px' }}>
          Welcome to Close Eye. Thank you for trusting us.
        </p>

        <div style={{
          display: 'inline-block', background: 'var(--forest)', color: 'var(--sage)',
          fontWeight: 800, fontSize: 14, padding: '8px 20px', borderRadius: 999, letterSpacing: '.02em',
          marginBottom: 22,
        }}>
          Founding Member #{paddedNum}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--gray-light)', borderRadius: 16, padding: '16px 18px', textAlign: 'left', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--gray-mid)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            What happens next
          </p>
          {[
            "Our care team reaches out within 24–48 hours to set up your parent's visits.",
            'Ask Close Eye is now personalised to your parent — unlimited questions.',
            "You'll get a WhatsApp report after every visit, within one hour.",
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#243831', padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(14,42,31,.06)' : 'none' }}>
              <span style={{ fontWeight: 700, color: 'var(--forest)', flexShrink: 0 }}>{i + 1}.</span>
              {item}
            </div>
          ))}
        </div>

        <div style={{
          background: '#e7f6ec', border: '1px solid #c4e7d1', borderRadius: 14,
          padding: '13px 14px', display: 'flex', gap: 10, textAlign: 'left', marginBottom: 20,
        }}>
          <span style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
            background: '#25d366', display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13,
          }}>✓</span>
          <p style={{ fontSize: 13, color: '#1d3a2a', margin: 0, lineHeight: 1.55 }}>
            <strong>WhatsApp welcome sent</strong> — check your WhatsApp. Save the number so you never miss an update.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: '100%', background: 'var(--forest)', color: '#FAF7F2',
            border: 0, borderRadius: 14, padding: '15px', fontFamily: 'inherit',
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

  const [payState, setPayState]             = useState<PayState>('idle')
  const [foundingNumber, setFoundingNumber] = useState<number | null>(null)
  const [errMsg, setErrMsg]                 = useState<string | null>(null)
  const [elderName, setElderName]           = useState<string | null>(null)

  // Auth guard — unauthenticated users get sent to sign in first, then return here
  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ type: 'membership' }))
      navigate('/auth?mode=signup', { replace: true })
    }
  }, [loading, user, navigate])

  // Already a founding member → skip confirmation, show success
  useEffect(() => {
    if (profile?.is_founding_member && profile.founding_number) {
      setFoundingNumber(profile.founding_number)
      setPayState('success')
    }
  }, [profile])

  // Load first loved one's name for personal context ("Set up Amma's care")
  useEffect(() => {
    if (!user) return
    supabase.from('loved_ones')
      .select('full_name').eq('family_user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setElderName(data.full_name.split(' ')[0]) })
  }, [user])

  async function handlePay() {
    setErrMsg(null)
    setPayState('creating')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-membership', { body: {} })
      if (fnErr || !data?.order_id) throw new Error(data?.error || 'Could not start checkout.')

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')

      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: 'INR',
        name: 'Close Eye',
        description: 'Founding Membership',
        image: '/favicon.svg',
        theme: { color: '#0E2A1F' },
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
          contact: profile?.whatsapp_number || '',
        },
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          setPayState('verifying')
          try {
            const { data: vData, error: vErr } = await supabase.functions.invoke('razorpay-verify-membership', {
              body: {
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id:   resp.razorpay_order_id,
                razorpay_signature:  resp.razorpay_signature,
              },
            })
            if (vErr) throw new Error('Verification failed')
            setFoundingNumber(vData?.founding_number ?? 1)
            setPayState('success')
          } catch {
            setErrMsg("Payment received — verifying took longer than expected. We'll confirm your membership by WhatsApp within a few minutes.")
            setPayState('error')
          }
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

  // ── Overlay states ────────────────────────────────────────────────────────
  if (payState === 'verifying') return <VerifyingScreen />
  if (payState === 'success' && foundingNumber) return <SuccessScreen foundingNumber={foundingNumber} />

  // Wait for auth to resolve
  if (loading || !user) return null

  const isBusy      = payState === 'creating'
  const parentLabel = elderName ? `${elderName}'s` : "your parent's"
  const firstName   = profile?.full_name?.split(' ')[0]

  // ── Confirmation screen ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'inherit' }}>

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
          <Logo className="w-6 h-6" /> close eye
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

        {/* Breadcrumb context */}
        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '0 0 20px', fontWeight: 500 }}>
          {firstName ? `Signed in as ${firstName}` : 'Founding Membership'} · Before 15 August
        </p>

        {/* Page headline */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--forest)', margin: '0 0 6px', lineHeight: 1.2 }}>
          Set up {parentLabel} care
        </h1>
        <p style={{ fontSize: 15, color: 'var(--gray-mid)', margin: '0 0 28px', lineHeight: 1.5 }}>
          Begin as a Founding Member — covers your whole family.
        </p>

        {/* ── Plan card ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(14,42,31,0.10)',
          borderRadius: 20,
          boxShadow: '0 2px 12px rgba(14,42,31,0.07)',
          overflow: 'hidden',
        }}>

          {/* Header row: label + price */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(14,42,31,0.07)',
          }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--forest)', margin: 0 }}>Founding Member</p>
              <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '3px 0 0' }}>One-time registration fee</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--forest)' }}>₹100</span>
              <span style={{ fontSize: 13, color: 'var(--gray-mid)', marginLeft: 5 }}>to start</span>
            </div>
          </div>

          {/* Benefits list */}
          <ul style={{ listStyle: 'none', margin: 0, padding: '8px 20px 4px' }}>
            {PERKS.map((perk, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0',
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

          {/* Pay button section */}
          <div style={{ padding: '16px 20px 20px' }}>
            <button
              onClick={handlePay}
              disabled={isBusy}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', background: isBusy ? 'rgba(14,42,31,0.5)' : 'var(--forest)',
                color: '#FAF7F2', border: 0, borderRadius: 14,
                padding: '15px 20px', fontFamily: 'inherit', fontWeight: 800,
                fontSize: 16, cursor: isBusy ? 'not-allowed' : 'pointer',
                minHeight: 52, transition: 'background 0.15s',
              }}
            >
              {isBusy
                ? <><Loader2 size={18} style={{ animation: 'fmc-spin 1s linear infinite' }} /> Starting…</>
                : <>Pay ₹100 · Razorpay <ArrowRight size={18} /></>
              }
            </button>

            {/* Trust line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
                Secure payment by Razorpay · International cards accepted
              </span>
            </div>
          </div>
        </div>

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
