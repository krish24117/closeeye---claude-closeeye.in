'use client'

import { useEffect, useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import clsx from 'clsx'

const FAQS: { id?: string; q: string; a: string }[] = [
  {
    q: 'What is a Close Eye visit?',
    a: 'A Close Eye visit is a friendly, in-person home call by a verified local companion. They spend 60–90 minutes with your loved one — sharing tea, checking on their mood and health, doing a basic home-safety walk-through, and making sure medications are in order. Within an hour you receive a detailed report with time-stamped photos on your dashboard and WhatsApp. It is not a medical service — it is a warm human presence, with professional accountability built in.'
  },
  {
    q: 'Where in India do you operate?',
    a: "We are currently serving families in Hyderabad and actively expanding to Bengaluru, Chennai, Mumbai, and Delhi. If your loved one is in a city not yet listed, join the waitlist — we prioritise new cities based on demand and will notify you the moment we're operational near them."
  },
  {
    q: 'Are companions verified?',
    a: 'Yes — every companion goes through a 5-layer verification process before their first visit. This includes a police clearance certificate, government-issued identity verification, permanent address confirmation, employment history check, and two personal references. Companions are also trained in elder companionship, first-response basics, and medication-reminder protocols. No companion meets your family without completing this process — no exceptions.'
  },
  {
    q: 'How quickly can a visit happen?',
    a: "Standard visits are scheduled within 24–48 hours of booking. Emergency visits are dispatched on a priority basis — typically within a few hours of your request, subject to companion availability in your loved one's city. Hospital companion visits should ideally be booked at least 24 hours in advance to allow time for companion briefing and coordination."
  },
  {
    q: 'How do I pay?',
    a: 'All payments are made securely through the Close Eye platform — by card, UPI, or net banking. Companions never handle cash, and there are no hidden fees. For monthly and quarterly plans, payment is collected upfront at the start of the billing cycle. You will receive a GST invoice for every transaction.'
  },
  {
    q: 'What about privacy?',
    a: "Your family's privacy is our most important product feature. Visit reports and photos are shared only with the registered family contacts you designate — no one else. Companions sign a strict confidentiality agreement before joining the network. We never share personal data with third parties. Our full Privacy Policy is available at closeeye.in/privacy-policy."
  },
  {
    q: 'What if my parent refuses the visit?',
    a: 'This is more common than you might think, and companions are trained to handle it gently. On a first visit, the companion introduces themselves as a family friend making a check-in — not as a carer or monitor. If your loved one is still uncomfortable, we will reschedule and speak with you about the best approach. We never force entry or create distress.'
  },
  {
    q: 'Can I speak to the companion before the visit?',
    a: 'Yes. On monthly and quarterly plans, you are introduced to your dedicated companion via a brief WhatsApp call before their first visit. For one-time visits, you can request this introduction and we will arrange it. We want you to feel confident before anyone meets your family.'
  },
  {
    id: 'cancellation',
    q: 'What is your cancellation policy?',
    a: 'Cancel at least 24 hours before a scheduled visit for a full refund. Cancellations within 24 hours are eligible for a credit toward a future visit. Emergency visits, once dispatched, are non-refundable. Monthly and quarterly plans can be paused for up to 30 days per billing cycle — contact us on WhatsApp to arrange this. Refunds are processed within 5–7 business days to the original payment method.'
  },
]

export function FAQContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0) // First one open by default

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i)
  }

  // Open and scroll to the FAQ item matching the URL hash (e.g. /faq#cancellation)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return

    const index = FAQS.findIndex((f) => f.id === hash)
    if (index === -1) return

    setOpenIndex(index)
    const el = document.getElementById(hash)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [])

  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">FAQ</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">Questions families ask before they trust us.</h1>
        <p className="text-white/65 max-w-md mx-auto text-sm">Everything you need to know about Close Eye visits, companions, pricing, and coverage.</p>
      </div>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="divide-y divide-gray-100">
          {FAQS.map((f, i) => (
            <div key={i} id={f.id} className="py-1 scroll-mt-24">
              <button
                id={`faq-q-${i}`}
                onClick={() => toggle(i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-a-${i}`}
                className="w-full flex justify-between items-center py-4 sm:py-5 text-left gap-4 group"
              >
                <span className={clsx(
                  'font-semibold text-sm sm:text-base transition-colors',
                  openIndex === i ? 'text-green-700' : 'text-green-900 group-hover:text-green-700'
                )}>
                  {f.q}
                </span>
                <span className={clsx(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  openIndex === i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600'
                )}>
                  {openIndex === i
                    ? <Minus size={14} />
                    : <Plus size={14} />
                  }
                </span>
              </button>

              {/* Answer — always rendered but hidden with CSS for smooth animation */}
              <div
                id={`faq-a-${i}`}
                role="region"
                aria-labelledby={`faq-q-${i}`}
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}>
                <p className="pb-5 text-sm sm:text-base text-gray-500 leading-relaxed">
                  {f.a}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-10 bg-green-50 rounded-2xl p-6 text-center">
          <p className="font-semibold text-green-900 mb-2">Still have questions?</p>
          <p className="text-sm text-gray-500 mb-5">We&apos;re happy to chat. Reach us on WhatsApp or email — we reply within a few hours.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/919000221261"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
            >
              💬 WhatsApp Us
            </a>
            <a
              href="mailto:hello@closeeye.in"
              className="inline-flex items-center justify-center gap-2 border border-green-200 text-green-800 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              ✉️ Email Us
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
