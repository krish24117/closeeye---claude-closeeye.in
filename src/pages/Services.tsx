// src/pages/Services.tsx
import { Link } from 'react-router-dom'

const SERVICES = [
  { price:'₹999', name:'Companion Visit', desc:'A friendly home visit, warm conversation, basic wellbeing and home-safety check, photos and a detailed report shared with the family.', items:['60–90 minute visit','Wellbeing & mood check','Photos and notes','Report on dashboard & WhatsApp'], type:'companion_visit_single' },
  { price:'₹1,499', name:'Hospital Companion', desc:'A trusted companion accompanies your loved one to a hospital or doctor appointment and updates the family throughout.', items:['Pickup & drop coordination','Companion through appointment','Doctor instructions captured','Photos of prescriptions'], type:'hospital_companion_single' },
  { price:'₹1,999', name:'Emergency Visit', desc:'Rapid on-ground support when something feels off — a verified person at the door within hours.', items:['Priority dispatch','Live updates to family','Coordination with neighbours','Follow-up visit included'], type:'emergency_visit' },
  { price:'from ₹2,999/mo', name:'Monthly Care Plan', desc:'Recurring monthly visits with the same companion where possible and priority emergency support.', items:['4, 8 or 12 visits/month','Same companion where possible','Monthly summary report','Priority emergency support'], type:'care_plan_4_monthly' },
]

export function ServicesPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Services</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">A trusted presence, on the days you cannot be there.</h1>
        <p className="text-white/65 max-w-lg mx-auto text-sm sm:text-base">Every service includes a verified local companion, photos and a full report.</p>
        <p className="mt-4 text-sm text-green-300">Currently serving <strong>Hyderabad</strong> — expanding soon.</p>
      </div>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {SERVICES.map(s=>(
          <div key={s.type} className="border-2 border-gray-100 rounded-2xl p-6 sm:p-8 hover:shadow-card transition-shadow">
            <p className="font-serif text-2xl sm:text-3xl text-green-900 mb-0.5">{s.price}</p>
            <p className="text-xs text-gray-400 mb-3">Payment via UPI · Bank Transfer · Cash</p>
            <h2 className="font-semibold text-lg text-green-900 mb-3">{s.name}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">{s.desc}</p>
            <ul className="space-y-2 mb-7">
              {s.items.map(i=><li key={i} className="flex items-center gap-2 text-sm text-gray-500"><span className="text-green-600 font-bold">✓</span>{i}</li>)}
            </ul>
            <Link to="/waitlist" className="block text-center bg-green-800 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">Book now</Link>
          </div>
        ))}
      </section>
      <div className="bg-green-50 text-center px-4 sm:px-6 py-12 sm:py-14">
        <h2 className="font-serif text-2xl text-green-900 mb-3">Not sure where to start?</h2>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">Tell us about your family and we'll recommend the right plan.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/waitlist" className="bg-green-800 text-white font-semibold px-7 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm">Join Waitlist</Link>
          <Link to="/contact" className="border-2 border-green-200 text-green-800 font-medium px-7 py-3 rounded-xl hover:bg-green-50 transition-colors text-sm">Book a call</Link>
        </div>
      </div>
    </main>
  )
}
