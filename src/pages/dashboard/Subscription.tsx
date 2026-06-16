import { useState, useEffect, useCallback } from 'react'
import { CreditCard, CheckCircle, AlertTriangle, Crown, Pause, XCircle, RotateCcw, Loader2, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PLANS, PLAN_NAMES, type PlanId } from '@/lib/subscription-plans'

interface Subscription {
  id: string
  plan_id: PlanId
  razorpay_subscription_id: string | null
  status: string
  current_start: string | null
  current_end: string | null
  next_billing_at: string | null
  total_paid_paise: number
  invoice_count: number
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  created:       { label: 'Pending setup',       color: 'bg-amber-100 text-amber-700' },
  authenticated: { label: 'Activating…',         color: 'bg-blue-100 text-blue-700' },
  active:        { label: 'Active',               color: 'bg-green-100 text-green-700' },
  paused:        { label: 'Paused',               color: 'bg-gray-100 text-gray-600' },
  halted:        { label: 'Payment failed',       color: 'bg-red-100 text-red-700' },
  cancelled:     { label: 'Cancelled',            color: 'bg-gray-100 text-gray-500' },
  completed:     { label: 'Completed',            color: 'bg-gray-100 text-gray-500' },
  expired:       { label: 'Expired',              color: 'bg-gray-100 text-gray-500' },
}

export function DashboardSubscription() {
  const { user, profile } = useAuth()
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<PlanId | null>(null)
  const [managing, setManaging] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const loadSub = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('subscriptions').select('*').maybeSingle()
    setSub(data || null)
    setLoading(false)
  }, [])

  useEffect(() => { loadSub() }, [loadSub])

  async function handleSubscribe(planId: PlanId) {
    setSubscribing(planId)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-create-subscription', {
        body: { plan_id: planId },
      })
      if (fnErr || !data?.subscription_id) {
        throw new Error(data?.error || 'Failed to create subscription.')
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Please refresh and try again.')

      const plan = PLANS.find(p => p.id === planId)!
      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Close Eye',
        description: `${plan.name} Plan — ${plan.priceLabel}`,
        image: '/favicon.svg',
        theme: { color: '#0E2A1F' },
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
          contact: profile?.whatsapp_number || '',
        },
        handler: async (response: { razorpay_subscription_id: string }) => {
          await supabase.from('subscriptions')
            .update({ status: 'authenticated' })
            .eq('razorpay_subscription_id', response.razorpay_subscription_id)
          setSuccessMsg('Payment setup complete! Your plan will activate within a few minutes.')
          loadSub()
          setTimeout(() => setSuccessMsg(null), 6000)
        },
        modal: { backdropclose: false },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubscribing(null)
    }
  }

  async function handleManage(action: 'pause' | 'resume' | 'cancel') {
    setManaging(action)
    setError(null)
    setConfirmCancel(false)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('razorpay-manage-subscription', {
        body: { action },
      })
      if (fnErr || !data?.success) throw new Error(data?.error || 'Action failed.')
      const messages: Record<string, string> = {
        pause: 'Plan paused. You can resume at any time.',
        resume: 'Plan resumed.',
        cancel: 'Plan cancelled. Access continues until the end of the billing period.',
      }
      setSuccessMsg(messages[action])
      loadSub()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setManaging(null)
    }
  }

  const activeSub = sub && ['active', 'authenticated', 'paused', 'halted'].includes(sub.status)
  const endedSub = sub && ['cancelled', 'completed', 'expired'].includes(sub.status)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Subscription</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your Close Eye plan and billing.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={() => setError(null)} className="font-semibold underline whitespace-nowrap">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl p-4 flex items-center gap-2">
          <CheckCheck size={16} /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-green-600" />
        </div>
      ) : activeSub ? (
        /* ── Active subscription view ──────────────────────── */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-green-100 p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-800 rounded-2xl flex items-center justify-center">
                  <Crown size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-serif text-lg text-green-900">{PLAN_NAMES[sub!.plan_id]} Plan</p>
                  <p className="text-sm text-gray-400">{PLANS.find(p => p.id === sub!.plan_id)?.priceLabel}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_LABEL[sub!.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[sub!.status]?.label || sub!.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-5">
              {[
                ['Next billing', sub!.next_billing_at ? format(new Date(sub!.next_billing_at), 'd MMM yyyy') : '—'],
                ['Total paid', `₹${Math.round(sub!.total_paid_paise / 100).toLocaleString('en-IN')}`],
                ['Invoices', String(sub!.invoice_count)],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-semibold text-green-900 text-sm">{val}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {sub!.status === 'active' && (
                <button
                  onClick={() => handleManage('pause')}
                  disabled={managing !== null}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {managing === 'pause' ? <Loader2 size={15} className="animate-spin" /> : <Pause size={15} />}
                  Pause plan
                </button>
              )}
              {sub!.status === 'paused' && (
                <button
                  onClick={() => handleManage('resume')}
                  disabled={managing !== null}
                  className="flex items-center gap-2 bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {managing === 'resume' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  Resume plan
                </button>
              )}
              {confirmCancel ? (
                <div className="flex items-center gap-2 bg-red-50 rounded-xl p-3 flex-wrap">
                  <p className="text-sm text-red-700">Cancel at end of billing cycle?</p>
                  <button
                    onClick={() => handleManage('cancel')}
                    disabled={managing !== null}
                    className="text-sm font-bold text-red-600 hover:text-red-800 underline disabled:opacity-60"
                  >
                    {managing === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button onClick={() => setConfirmCancel(false)} className="text-sm text-gray-400 hover:text-gray-600">
                    Keep plan
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <XCircle size={15} /> Cancel plan
                </button>
              )}
            </div>
          </div>

          {/* Features reminder */}
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Your plan includes</p>
            <ul className="space-y-1.5">
              {PLANS.find(p => p.id === sub!.plan_id)?.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        /* ── Plan picker ──────────────────────────────────── */
        <div className="space-y-4">
          {(endedSub || sub?.status === 'created') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="flex-shrink-0" />
              {endedSub ? 'Your previous plan has ended. Choose a plan below to reactivate.' : 'Your payment setup is pending. Choose a plan or retry below.'}
            </div>
          )}

          <p className="text-sm text-gray-500">Choose the plan that's right for your family.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col ${
                  plan.popular ? 'border-green-600' : plan.best ? 'border-green-800' : 'border-gray-100'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                {plan.best && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-800 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Best Value
                  </span>
                )}

                <div className="mb-4">
                  <p className="font-serif text-lg text-green-900">{plan.name}</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{plan.priceLabel}</p>
                  <p className="text-xs text-gray-400 mt-1">{plan.tagline}</p>
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle size={13} className="text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : plan.best
                        ? 'bg-green-800 text-white hover:bg-green-900'
                        : 'bg-green-50 text-green-800 hover:bg-green-100'
                  }`}
                >
                  {subscribing === plan.id ? (
                    <><Loader2 size={15} className="animate-spin" /> Setting up…</>
                  ) : (
                    <><CreditCard size={14} /> Get started</>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-gray-400">
            Billed monthly. Cancel anytime without contacting support. Invoices emailed after each payment.
          </p>
        </div>
      )}
    </div>
  )
}
