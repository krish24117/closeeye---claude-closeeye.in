import { supabase } from '@/lib/supabase'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise: Promise<boolean> | null = null

/** Load Razorpay Checkout once (idempotent). Resolves false if it can't load. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => { scriptPromise = null; resolve(false) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export interface Prefill {
  name?: string
  email?: string
  contact?: string
}

/** The distinct outcomes the UI must handle. */
export type PayOutcome =
  | { status: 'success' }
  | { status: 'dismissed' } // user closed the sheet (cancellation)
  | { status: 'failed'; message: string } // Razorpay reported a payment failure
  | { status: 'unavailable'; message: string } // couldn't create the order/subscription
  | { status: 'error'; message: string } // script/network problem

const THEME = { color: '#0E2A1F' }

/**
 * Membership subscription checkout. Activation is webhook-driven
 * (subscription.activated → status='active'); on the client we optimistically
 * mark the row 'authenticated' so the UI reflects the pending activation.
 */
export async function payForMembership(opts: {
  planId: 'companion' | 'trust' | 'family_os'
  planName: string
  prefill: Prefill
}): Promise<PayOutcome> {
  const { data, error } = await supabase.functions.invoke('razorpay-create-subscription', {
    body: { plan_id: opts.planId },
  })
  if (error || !data?.subscription_id || !data?.key_id) {
    return { status: 'unavailable', message: 'This plan isn’t available for online activation yet. Please try again shortly.' }
  }

  const loaded = await loadRazorpay()
  if (!loaded || !window.Razorpay) {
    return { status: 'error', message: 'We couldn’t reach the payment service. Check your connection and try again.' }
  }

  return new Promise<PayOutcome>((resolve) => {
    const rzp = new window.Razorpay({
      key: data.key_id,
      subscription_id: data.subscription_id,
      name: 'Close Eye',
      description: `${opts.planName} membership`,
      theme: THEME,
      prefill: opts.prefill,
      modal: { backdropclose: false, ondismiss: () => resolve({ status: 'dismissed' }) },
      handler: async (resp: { razorpay_subscription_id?: string }) => {
        try {
          if (resp?.razorpay_subscription_id) {
            await supabase.from('subscriptions').update({ status: 'authenticated' }).eq('razorpay_subscription_id', resp.razorpay_subscription_id)
          }
        } catch {
          /* the webhook is the source of truth for activation */
        }
        resolve({ status: 'success' })
      },
    })
    rzp.on('payment.failed', (e: { error?: { description?: string } }) =>
      resolve({ status: 'failed', message: e?.error?.description || 'The payment didn’t go through. Please try again.' }),
    )
    rzp.open()
  })
}

/**
 * One-time payment for a confirmed booking request (create-booking-payment-order
 * → Razorpay order → payment.captured webhook marks it paid). Amount is
 * server-authoritative from booking_requests.amount_paise.
 */
export async function payForBooking(opts: { bookingRequestId: string; prefill: Prefill }): Promise<PayOutcome> {
  const { data, error } = await supabase.functions.invoke('create-booking-payment-order', {
    body: { booking_request_id: opts.bookingRequestId },
  })
  if (error || !data?.order_id || !data?.key_id) {
    return { status: 'unavailable', message: 'This visit isn’t ready for payment yet. Please try again shortly.' }
  }

  const loaded = await loadRazorpay()
  if (!loaded || !window.Razorpay) {
    return { status: 'error', message: 'We couldn’t reach the payment service. Check your connection and try again.' }
  }

  return new Promise<PayOutcome>((resolve) => {
    const rzp = new window.Razorpay({
      key: data.key_id,
      order_id: data.order_id,
      amount: data.amount_paise,
      currency: 'INR',
      name: 'Close Eye',
      description: 'Close Eye visit',
      theme: THEME,
      prefill: opts.prefill,
      modal: { backdropclose: false, ondismiss: () => resolve({ status: 'dismissed' }) },
      handler: () => resolve({ status: 'success' }),
    })
    rzp.on('payment.failed', (e: { error?: { description?: string } }) =>
      resolve({ status: 'failed', message: e?.error?.description || 'The payment didn’t go through. Please try again.' }),
    )
    rzp.open()
  })
}
