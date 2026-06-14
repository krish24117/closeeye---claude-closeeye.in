import { useState } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

const FAQS = [
  { q:'What is a Close Eye visit?', a:'A Close Eye visit is a friendly, in-person home call by a verified local companion. They spend 60–90 minutes with your loved one — sharing tea, checking on their mood and health, doing a basic home-safety walk-through, and making sure medications are in order. Within an hour you receive a detailed report with time-stamped photos.' },
  { q:'Where in India do you operate?', a:'We are currently serving families in Hyderabad and actively expanding to Bengaluru, Chennai, Mumbai, and Delhi. If your loved one is in a city not yet listed, join the waitlist — we prioritise new cities based on demand.' },
  { q:'Are companions verified?', a:'Yes — every companion goes through a 5-layer verification process: police clearance certificate, government-issued identity verification, permanent address confirmation, employment history check, and two personal references. No companion meets your family without completing this process.' },
  { q:'How quickly can a visit happen?', a:'Standard visits are scheduled within 24–48 hours. Emergency visits are dispatched on a priority basis — typically within a few hours. Hospital companion visits should be booked at least 24 hours in advance.' },
  { q:'How do I pay?', a:'All payments are made securely through the Close Eye platform — by card, UPI, or net banking. Companions never handle cash. You will receive a GST invoice for every transaction.' },
  { q:'What about privacy?', a:'Visit reports and photos are shared only with the registered family contacts you designate. Companions sign a strict confidentiality agreement. We never share personal data with third parties.' },
  { q:'What if my parent refuses the visit?', a:'This is common, and companions are trained to handle it gently. On a first visit, the companion introduces themselves as a family friend making a check-in. If your loved one is still uncomfortable, we will reschedule and speak with you.' },
  { q:'Can I speak to the companion before the visit?', a:'Yes. On monthly and quarterly plans, you are introduced to your dedicated companion via a brief WhatsApp call before their first visit. For one-time visits, you can request this introduction.' },
  { q:'What is your cancellation policy?', a:'Cancel at least 24 hours before a scheduled visit for a full refund. Cancellations within 24 hours receive a credit toward a future visit. Emergency visits, once dispatched, are non-refundable.' },
]

export function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-6 py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">FAQ</p>
        <h1 className="font-serif text-4xl mb-4">Questions families ask before they trust us.</h1>
      </div>
      <section className="max-w-2xl mx-auto px-6 py-16">
        {FAQS.map((f,i)=>(
          <div key={i} className="border-b border-gray-100">
            <button
              onClick={()=>setOpen(open===i?null:i)}
              className="w-full flex justify-between items-center py-5 text-left gap-4"
            >
              <span className="font-semibold text-green-900 text-sm">{f.q}</span>
              <Plus size={18} className={clsx('text-green-600 flex-shrink-0 transition-transform',open===i&&'rotate-45')} />
            </button>
            {open===i && (
              <p className="pb-5 text-sm text-gray-500 leading-relaxed animate-fade-in">{f.a}</p>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}
