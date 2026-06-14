import { Link } from 'react-router-dom'
import { Shield, Camera, Clock, RefreshCw, AlertCircle, Banknote, ChevronRight } from 'lucide-react'

const TRUST = [
  { icon: Shield, title: '5-Layer Background Verification', desc: 'Police clearance, address verification, identity checks, employment history and two personal references.', tag: 'Verified before Day 1' },
  { icon: Camera, title: 'Photo-Verified Visit Reports', desc: 'Every visit generates a time-stamped report with photos and a wellbeing summary — sent within the hour.', tag: 'Real-time accountability' },
  { icon: Clock, title: 'Trained for Elder Companionship', desc: 'Companions are trained in first-response basics, medication reminders and emotional engagement.', tag: 'Certified & supervised' },
  { icon: RefreshCw, title: 'Guaranteed Replacement in 24hrs', desc: 'If your companion is ever unavailable, we arrange a briefed replacement. Your parents never experience a gap.', tag: 'Zero-gap guarantee' },
  { icon: AlertCircle, title: 'Emergency Protocol Built In', desc: 'Every companion knows your family\'s doctor, nearest hospital and your emergency contact.', tag: 'Pre-briefed always' },
  { icon: Banknote, title: 'No Cash, No Keys — Ever', desc: 'Companions never handle cash or hold property keys unsupervised. All payments flow through the platform.', tag: 'Structural safeguard' },
]

const PRICING = [
  { type: 'companion_visit_single', name: 'One-Time Visit', price: '₹999', note: 'single visit', items: ['1 home visit', 'Photo report', 'WhatsApp updates'], popular: false },
  { type: 'care_plan_4_monthly', name: 'Monthly Plan', price: '₹2,999', note: 'per month · 4 visits', items: ['4 visits per month', 'Dedicated companion', 'Priority support'], popular: true },
  { type: 'care_plan_quarterly', name: 'Quarterly Plan', price: '₹7,999', note: 'per quarter · best value', items: ['12 visits / quarter', '1 free emergency visit', 'Dedicated companion'], popular: false },
  { type: 'emergency_visit', name: 'Emergency Visit', price: '₹1,999', note: 'same-day dispatch', items: ['Same-day dispatch', 'Live family updates', '24/7 hotline'], popular: false },
]

export function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white px-6 py-24 md:py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(74,155,106,.15),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-green-200 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Trusted by NRI families across 5 countries
          </div>
          <p className="text-green-300 text-sm mb-3 font-medium">A Support System, Not A Replacement</p>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-6">
            When you can't be there,<br />
            <em className="text-green-200 not-italic">Close Eye</em> can.
          </h1>
          <p className="text-white/75 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Verified wellbeing visits and trusted local support for your loved ones in India. Real visits. Real photos. Real reports.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/waitlist" className="bg-white text-green-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors">
              Join Waitlist
            </Link>
            <Link to="/contact" className="border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">
              Book a call
            </Link>
          </div>
          <p className="mt-8 text-white/40 text-xs tracking-widest">USA · UK · UAE · CA · AU</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-14 bg-white/10 rounded-2xl overflow-hidden border border-white/10">
            {[['47+','families on waitlist'],['Hyderabad','live city'],['4.9★','satisfaction'],['<1hr','report delivery']].map(([v,l])=>(
              <div key={l} className="py-5 px-4 bg-white/5 text-center">
                <strong className="block font-serif text-2xl text-white">{v}</strong>
                <span className="text-white/50 text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Our Services</p>
        <h2 className="font-serif text-3xl md:text-4xl text-green-900 mb-12">
          A trusted presence, on the days<br className="hidden md:block" /> you cannot be there.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { price:'₹999', name:'Companion Visit', desc:'Friendly home visit with wellbeing check, photos and a full report.', href:'/services' },
            { price:'₹1,499', name:'Hospital Companion', desc:'A companion accompanies your loved one to appointments and updates you.', href:'/services' },
            { price:'₹1,999', name:'Emergency Visit', desc:'Same-day dispatch when something feels off — a verified person within hours.', href:'/services' },
            { price:'from ₹2,999/mo', name:'Monthly Plan', desc:'Recurring visits with the same companion and priority emergency support.', href:'/services' },
          ].map(s => (
            <Link key={s.name} to={s.href} className="group border border-gray-100 rounded-2xl p-6 hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
              <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-4">{s.price}</span>
              <h3 className="font-serif text-lg text-green-900 mb-2">{s.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.desc}</p>
              <span className="text-green-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Learn more <ChevronRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-green-50 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Why families trust us</p>
          <h2 className="font-serif text-3xl md:text-4xl text-green-900 mb-12">
            We don't just send someone.<br className="hidden md:block" />
            <em className="not-italic text-green-600">We send the right someone.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST.map(t => (
              <div key={t.title} className="bg-white rounded-2xl p-6 border border-green-100">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  <t.icon size={20} className="text-green-700" />
                </div>
                <h3 className="font-semibold text-green-900 mb-2 text-sm">{t.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{t.desc}</p>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{t.tag}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-px mt-10 bg-green-100 rounded-2xl overflow-hidden border border-green-100">
            {[['47+','Families on waitlist'],['100%','Background-checked'],['<1hr','Report delivery']].map(([v,l])=>(
              <div key={l} className="py-7 text-center bg-white">
                <strong className="block font-serif text-3xl text-green-800">{v}</strong>
                <span className="text-gray-400 text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3 text-center">How it works</p>
        <h2 className="font-serif text-3xl md:text-4xl text-green-900 mb-14 text-center">Three steps to real peace of mind.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { n:'1', title:'Tell us about your loved one', desc:'Create a profile with their address, preferences and emergency contacts.' },
            { n:'2', title:'Request a visit', desc:'Choose a visit type and time. We match a verified local companion in their city.' },
            { n:'3', title:'Receive a real report', desc:'Photos, notes and a wellbeing summary land in your dashboard and on WhatsApp.' },
          ].map(s=>(
            <div key={s.n} className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-800 text-white font-serif text-2xl flex items-center justify-center mx-auto mb-5">{s.n}</div>
              <h3 className="font-semibold text-green-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-green-50 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Pricing</p>
          <h2 className="font-serif text-3xl md:text-4xl text-green-900 mb-4">Simple, transparent plans.</h2>
          <p className="text-gray-500 mb-12">Every plan includes verified companions, a detailed report, and 24/7 WhatsApp support.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRICING.map(p => (
              <div key={p.type} className={`relative bg-white rounded-2xl p-6 border-2 transition-shadow hover:shadow-card ${p.popular ? 'border-green-600 shadow-card' : 'border-gray-100'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">Popular</span>
                )}
                <h3 className="font-semibold text-green-900 mb-1">{p.name}</h3>
                <p className="font-serif text-3xl text-green-900 mt-3 mb-1">{p.price}</p>
                <p className="text-xs text-gray-400 mb-5">{p.note}</p>
                <ul className="space-y-2 mb-6">
                  {p.items.map(i => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="text-green-600 font-bold">✓</span> {i}
                    </li>
                  ))}
                </ul>
                <Link to="/waitlist" className="block text-center bg-green-800 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report */}
      <section className="bg-green-900 text-white px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
            <p className="text-xs text-green-300 font-semibold uppercase tracking-widest mb-5">✓ Visit completed</p>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm">PS</div>
              <div>
                <p className="font-semibold text-sm">Priya Sharma</p>
                <p className="text-xs text-green-300">Companion · Hyderabad</p>
              </div>
            </div>
            <p className="text-white/80 italic text-sm leading-relaxed mb-6">
              "Had a lovely tea with auntie today. She's looking forward to your call tonight. Medication taken on time."
            </p>
            <ul className="space-y-2">
              {['Mood & general wellbeing','Health & medication check','Home & safety observations','Photos from the visit','Notes for the family'].map(i=>(
                <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="text-green-400">📋</span> {i}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-5">"Mom is doing great."</h2>
            <p className="text-white/65 leading-relaxed mb-8">
              Every visit generates a detailed, time-stamped report delivered to your WhatsApp and dashboard within the hour. Real photos. Real notes. Real peace of mind from 10,000 km away.
            </p>
            <Link to="/waitlist" className="inline-block border border-white/30 text-white font-medium px-7 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Join Waitlist →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-green-800 to-green-700 text-white px-6 py-20 text-center">
        <h2 className="font-serif text-3xl md:text-4xl mb-4">Join the families we look after across India.</h2>
        <p className="text-white/65 mb-8">47 families are already on the waitlist. Be first in your city.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/waitlist" className="bg-white text-green-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors">Join Waitlist</Link>
          <Link to="/contact" className="border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">Book a call</Link>
        </div>
      </section>
    </main>
  )
}
