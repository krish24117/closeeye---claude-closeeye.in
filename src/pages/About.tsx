// src/pages/About.tsx
import { Link } from 'react-router-dom'
export function AboutPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-6 py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">About</p>
        <h1 className="font-serif text-4xl mb-4">Built for families abroad, trusted in India.</h1>
        <p className="text-white/65 max-w-lg mx-auto">Close Eye started with one question — how do we look after our parents when we live thousands of miles away?</p>
      </div>
      <section className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-gray-600 leading-relaxed mb-5">Close Eye is a Family Wellbeing Visit and Care Support service designed for families living apart from their loved ones in India. We send a warm, verified local companion to your loved one's home — and you receive a detailed report with real photos within hours.</p>
        <p className="text-gray-600 leading-relaxed mb-5">We are not a clinic, not a call centre, not an alert app. We are a human presence. Tea, a chat, a quick check on medicines — whatever helps your family feel close from afar.</p>
        <p className="text-gray-600 leading-relaxed mb-10">Close Eye was founded in Hyderabad by Krishna, a serial entrepreneur with a background in construction, fintech, and technology. Close Eye is a venture under <strong>Stexa Products & Services Pvt. Ltd.</strong></p>
        <h2 className="font-serif text-2xl text-green-900 mb-5">Our principles</h2>
        <ul className="space-y-3 mb-10">
          {[
            ['Real people, real visits.','Every companion is background-checked, trained and personally onboarded.'],
            ['Radical transparency.','Every visit comes with photos, notes and a wellbeing score. No filler.'],
            ['Built for trust.','Your family\'s data and your loved one\'s privacy are our most important product features.'],
            ['Designed for NRI families.','We understand the guilt, the distance, and the complexity of care across time zones.'],
          ].map(([t,d])=>(
            <li key={t} className="border-l-4 border-green-600 pl-4 py-3 bg-green-50 rounded-r-xl">
              <strong className="text-green-800 block text-sm mb-1">{t}</strong>
              <span className="text-sm text-gray-600">{d}</span>
            </li>
          ))}
        </ul>
        <Link to="/waitlist" className="inline-block bg-green-800 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-green-700 transition-colors">Join Waitlist</Link>
      </section>
    </main>
  )
}
