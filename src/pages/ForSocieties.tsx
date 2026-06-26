import { Link } from 'react-router-dom'
import { ShieldCheck, Siren, Wallet, UserRound, Check, ArrowRight } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'

const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_SOCIETY = `https://wa.me/${WA}?text=${encodeURIComponent(
  "Hi, I'm on the committee of a society and would like to book a Close Eye demo for our residents."
)}`
const WA_OVERVIEW = `https://wa.me/${WA}?text=${encodeURIComponent(
  'Hi, please share the Close Eye partnership overview for our society.'
)}`

const REASONS = [
  {
    icon: ShieldCheck,
    title: 'Verified companions',
    body: 'Every companion is background-checked, interviewed in person, and trained before their first visit — with a GPS check-in on every visit. No exceptions.',
  },
  {
    icon: Siren,
    title: 'A real emergency plan',
    body: 'Not a promise — a written escalation path: companion → care lead → family → nearest hospital. For falls, sudden illness, or distress, someone is dispatched within 2 hours.',
  },
  {
    icon: Wallet,
    title: 'No cost, no burden on the society',
    body: "Residents opt in and engage Close Eye directly. The society takes on no fee and no day-to-day operational load — you're enabling a service, not running one.",
    note: 'Have your lawyer review any liability/insurance wording before publishing.',
  },
  {
    icon: UserRound,
    title: 'Founder-led from day one',
    body: 'Our founder personally conducts the early visits in every new society, so trust is earned in person.',
  },
]

const RESIDENT_GETS = [
  'Wellbeing visits',
  'WhatsApp reports to family abroad',
  'Medicine & grocery runs',
  'Doctor & hospital accompaniment',
  'Emergency response',
]

const STEPS = [
  {
    title: 'A walkthrough with your committee',
    body: 'We explain the service, the safeguards, and answer questions. No commitment.',
  },
  {
    title: 'A pilot in your society',
    body: 'We serve a small group of resident families for 30 days with registration waived, so the committee sees it work before endorsing it.',
  },
  {
    title: 'Residents register and choose services',
    body: 'Families sign up (₹100 founding-member) and pick only what they need.',
  },
  {
    title: 'We stay accountable to you',
    body: 'A monthly check-in with the committee on coverage, visits, and resident feedback.',
  },
]

export function ForSocietiesPage() {
  return (
    <main className="overflow-x-hidden">

      {/* Hero */}
      <section className="bg-green-900 text-white px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-200 mb-4">For Resident Welfare Associations</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-tight mb-6">
            Bring trusted elder care into your community.
          </h1>
          <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-9">
            Close Eye gives your residents — especially those whose children live abroad — a verified
            companion, regular wellbeing visits, and a clear plan when something goes wrong. Setting it
            up costs the society nothing. Residents only pay for the services they choose.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WA_SOCIETY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-green-900 font-semibold px-7 py-3.5 rounded-xl hover:bg-green-200 transition-colors text-sm sm:text-base"
            >
              <FaWhatsapp size={18} className="text-[#25D366]" /> Book a society demo
            </a>
            <a
              href={WA_OVERVIEW}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm sm:text-base"
            >
              Request the partnership overview
            </a>
          </div>
        </div>
      </section>

      {/* Why societies partner with us */}
      <section className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-700 mb-3">Why societies partner with us</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-10">
            Built for what your committee actually worries about.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {REASONS.map(r => (
              <div key={r.title} className="bg-white rounded-2xl p-7 shadow-card">
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-green-900 mb-5">
                  <r.icon size={22} />
                </div>
                <h3 className="font-serif text-xl text-green-900 mb-2">{r.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{r.body}</p>
                {r.note && (
                  <p className="text-xs text-gray-400 italic mt-3">{r.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What your residents get */}
      <section className="bg-white px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-700 mb-3">What your residents get</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-8">
            Care residents can feel — reports families can trust.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {RESIDENT_GETS.map(item => (
              <span key={item} className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-900 text-sm font-medium px-4 py-2.5 rounded-full">
                <Check size={15} className="text-green-700" /> {item}
              </span>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-500">
            For residents of a partner society —{' '}
            <Link to="/services" className="font-semibold text-green-700 hover:text-green-900 underline underline-offset-2">
              see the family plans and register →
            </Link>
          </p>
        </div>
      </section>

      {/* How a partnership works */}
      <section className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-700 mb-3">How a partnership works</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-10">
            Four steps. No commitment to start.
          </h2>
          <ol className="space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-5">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-green-800 text-white font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-green-900 text-base mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Proof */}
      <section className="bg-white px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-serif text-2xl sm:text-3xl text-green-900 leading-snug">
            Already serving <span className="text-green-700">Rivera Residences</span>, and onboarding{' '}
            <span className="text-green-700">Lanco Hills</span>.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Hyderabad communities, growing one society at a time.
          </p>
          {/* A committee or resident quote will live here once available —
              RWAs trust other RWAs more than they trust a website. */}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-green-900 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-4">
          Let's bring Close Eye to your residents.
        </h2>
        <p className="text-white/70 mb-8 text-sm sm:text-base max-w-xl mx-auto">
          A 20-minute walkthrough with your committee — no commitment, no cost to the society.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={WA_SOCIETY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white text-green-900 font-semibold px-7 py-3.5 rounded-xl hover:bg-green-200 transition-colors text-sm sm:text-base"
          >
            <FaWhatsapp size={18} className="text-[#25D366]" /> Book a society demo
          </a>
          <Link
            to="/services"
            className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm sm:text-base"
          >
            For residents — see services <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </main>
  )
}
