import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Companion Plan',
    price: '₹999',
    period: '/month',
    tagline: 'Regular warmth and a watchful eye.',
    color: 'border-green-200',
    badge: '',
    features: [
      '2 visits per week',
      'Companion stays 60–90 min each visit',
      'Photos and wellbeing notes every visit',
      'WhatsApp report to family after each visit',
      'Mood and medication check',
      'Same companion where possible',
    ],
    cta: 'Get started',
    ctaStyle: 'border-2 border-green-800 text-green-800 hover:bg-green-800 hover:text-white',
  },
  {
    name: 'Trust Plan',
    price: '₹1,999',
    period: '/month',
    tagline: 'Daily presence. Complete peace of mind.',
    color: 'border-green-700 ring-2 ring-green-700',
    badge: 'Most popular',
    features: [
      'Daily visits (7 days a week)',
      'Live GPS tracking during each visit',
      'Doctor escort for appointments',
      'Prescription and report photos',
      'Weekly family summary call',
      'Priority emergency dispatch',
    ],
    cta: 'Get started',
    ctaStyle: 'bg-green-800 text-white hover:bg-green-700',
  },
  {
    name: 'Family OS',
    price: '₹3,499',
    period: '/month',
    tagline: 'Unlimited care. One dedicated companion.',
    color: 'border-green-900',
    badge: 'All-inclusive',
    features: [
      'Unlimited visits — any time, any day',
      'Dedicated named companion',
      'SOS alert — companion within 2 hours',
      'Hospital stays and overnight support',
      'Grocery and errand assistance',
      'Monthly video call with family included',
    ],
    cta: 'Get started',
    ctaStyle: 'border-2 border-green-800 text-green-800 hover:bg-green-800 hover:text-white',
  },
]

const ONE_OFF = [
  { name: 'Single Companion Visit', price: '₹999', desc: 'One-time home visit with photos and a full report.' },
  { name: 'Hospital Companion', price: '₹1,499', desc: 'Companion accompanies your loved one to a doctor or hospital appointment.' },
  { name: 'Emergency Visit', price: '₹1,999', desc: 'Priority dispatch — verified companion at the door within hours.' },
]

export function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Services & Pricing</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">A trusted presence, on the days you cannot be there.</h1>
        <p className="text-white/65 max-w-lg mx-auto text-sm sm:text-base">Choose a monthly plan or book a single visit. All services include a verified local companion, real photos, and a full report.</p>
        <p className="mt-4 text-sm text-green-300">Currently serving <strong>Hyderabad</strong> — expanding soon.</p>
      </div>

      {/* Monthly Plans */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl text-green-900 mb-2">Monthly plans</h2>
          <p className="text-gray-500 text-sm">Cancel or pause anytime. No lock-in.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative border-2 rounded-2xl p-6 sm:p-8 flex flex-col hover:shadow-lg transition-shadow ${plan.color}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              <div className="mb-5">
                <h3 className="font-serif text-xl text-green-900 mb-1">{plan.name}</h3>
                <p className="text-xs text-gray-400 mb-4">{plan.tagline}</p>
                <div className="flex items-end gap-1">
                  <span className="font-serif text-4xl text-green-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">+ GST · Paid via Razorpay (UPI / Card / NetBanking)</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                className={`block text-center font-semibold py-3 rounded-xl transition-colors text-sm ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* One-off services */}
      <section className="bg-green-50 px-4 sm:px-6 py-12 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl text-green-900 mb-2">Individual visits</h2>
            <p className="text-gray-500 text-sm">No subscription needed — pay per visit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ONE_OFF.map(s => (
              <div key={s.name} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-green-900 text-sm">{s.name}</p>
                  <span className="font-serif text-lg text-green-800 flex-shrink-0">{s.price}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-4">{s.desc}</p>
                <Link
                  to="/auth"
                  className="block text-center border border-green-200 text-green-800 text-xs font-semibold py-2 rounded-xl hover:bg-green-50 transition-colors"
                >
                  Book now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center px-4 sm:px-6 py-12 sm:py-14">
        <h2 className="font-serif text-2xl text-green-900 mb-3">Not sure which plan is right?</h2>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">Tell us about your family and we'll recommend the right level of support.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/contact" className="bg-green-800 text-white font-semibold px-7 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm">
            Talk to us
          </Link>
          <Link to="/waitlist" className="border-2 border-green-200 text-green-800 font-medium px-7 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm">
            Join Waitlist
          </Link>
        </div>
      </div>
    </main>
  )
}
