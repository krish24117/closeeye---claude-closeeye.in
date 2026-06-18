import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Check, Sparkles, Lightbulb,
  Home as HomeIcon, Stethoscope, Building2, BedDouble, Siren, ShoppingBasket, Wrench,
} from 'lucide-react'
import { PLANS } from '@/lib/subscription-plans'
import { ON_DEMAND_SERVICES } from '@/lib/one-time-services'

const TITLE = 'Services — Close Eye'
const DESCRIPTION = 'Companion visits, hospital companions, emergency visits, and monthly care plans — choose the right support for your loved one in India.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/services', images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`/api/og?title=${encodeURIComponent(TITLE)}`] },
}

const PLAN = PLANS[0]

const SERVICE_ICONS: Record<string, typeof HomeIcon> = {
  home_visit: HomeIcon,
  doctor_visit_assistance: Stethoscope,
  hospital_assistance_half_day: Building2,
  hospital_assistance_full_day: BedDouble,
  emergency_support_visit: Siren,
  grocery_medicine_assistance: ShoppingBasket,
  home_maintenance_coordination: Wrench,
}

export default function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Services & Pricing</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">A trusted presence, on the days you cannot be there.</h1>
        <p className="text-white/65 max-w-lg mx-auto text-sm sm:text-base">One simple plan, plus on-demand help whenever you need it.</p>
      </div>

      {/* ── Section 1: The subscription plan ───────────────────────────── */}
      <section className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative bg-white border-2 border-green-800 ring-2 ring-green-800 rounded-2xl shadow-xl p-7 sm:p-8 flex flex-col hover:shadow-2xl transition-shadow">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold-500 text-green-900 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            Best Value
          </span>
          <div className="mb-5 text-center">
            <h2 className="font-serif text-2xl text-green-900 mb-1">CloseEye Companion</h2>
            <p className="text-sm text-gray-400 mb-4">{PLAN.tagline}</p>
            <div className="flex items-end justify-center gap-1">
              <span className="font-serif text-4xl text-green-900">₹1,500</span>
              <span className="text-gray-400 text-sm mb-1">/month</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Paid via Razorpay (UPI / Card / NetBanking)</p>
          </div>

          <ul className="space-y-2.5 mb-7">
            {PLAN.features.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                <Check size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/contact"
            className="w-full min-h-[44px] text-center font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 bg-green-800 text-white hover:bg-green-700"
          >
            Subscribe Now
          </Link>
          <a
            href="https://wa.me/919000221261"
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs font-semibold text-green-700 hover:text-green-900 mt-3 underline"
          >
            Talk to us first
          </a>
        </div>
        <p className="text-center text-xs text-gray-400 mt-5">
          Cancel anytime. No lock-in. Setup within 48 hours of signup.
        </p>
      </section>

      {/* ── Smart upsell callout ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="max-w-4xl mx-auto bg-green-50 border border-green-200 rounded-2xl p-5 sm:p-6 flex items-start gap-3 sm:gap-4">
          <Lightbulb size={20} className="text-green-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-900 leading-relaxed">
            <strong>Subscribers save automatically</strong> — your monthly home visit is included in the ₹1,500/month plan, saving ₹1,000 vs booking on-demand.
          </p>
        </div>
      </section>

      {/* ── Section 2: Consultation banner ─────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="max-w-4xl mx-auto bg-white border-2 border-green-800 rounded-2xl shadow-card-hover p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          <div className="w-12 h-12 bg-green-800 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-serif text-xl sm:text-2xl text-green-900 mb-1.5">Have questions? Let&apos;s talk first.</h2>
            <p className="text-sm text-gray-500">Book a free 15-minute call. No pressure, no commitment.</p>
          </div>
          <a
            href="https://wa.me/919000221261"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm whitespace-nowrap flex-shrink-0"
          >
            Book a Free Consultation
          </a>
        </div>
      </section>

      {/* ── Section 3: On-demand services ──────────────────────────────── */}
      <section className="bg-green-50 px-4 sm:px-6 py-12 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl text-green-900 mb-2">Need something specific? Pay only for what you need.</h2>
            <p className="text-gray-500 text-sm">All services are available à la carte. No subscription required.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ON_DEMAND_SERVICES.map(s => {
              const Icon = SERVICE_ICONS[s.type] ?? HomeIcon
              return (
                <div key={s.type} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-green-700" />
                      </div>
                      <p className="font-bold text-green-900 text-sm">{s.name}</p>
                    </div>
                    <span className="font-serif text-xl text-green-700 flex-shrink-0">{s.price}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-4">{s.desc}</p>
                  <Link
                    href="/contact"
                    className="block min-h-[44px] text-center border border-green-200 text-green-800 text-xs font-semibold py-2 rounded-xl hover:bg-green-50 transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: Custom Care ──────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-md mx-auto bg-green-900 text-white rounded-2xl p-7 sm:p-8 flex flex-col text-center">
          <h2 className="font-serif text-2xl mb-1">Custom Care</h2>
          <p className="text-xs text-green-300 mb-4">Tailored to your family&apos;s needs</p>
          <p className="text-sm text-white/70 leading-relaxed mb-6">
            Multiple parents? Special medical needs? We&apos;ll build a plan just for your family.
          </p>
          <a
            href="https://wa.me/919000221261"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center font-semibold py-3 rounded-xl transition-colors text-sm bg-white text-green-900 hover:bg-green-50"
          >
            Request a Quote
          </a>
        </div>
      </section>

      {/* ── Payment note ──────────────────────────────────────────────── */}
      <p className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 text-center text-xs text-gray-400 leading-relaxed">
        All prices are in Indian Rupees (INR). Payments are processed securely via Razorpay (UPI, cards,
        net banking). International card support is rolling out — WhatsApp us if you&apos;re paying from
        outside India. Invoices provided for every transaction.
      </p>
    </main>
  )
}
