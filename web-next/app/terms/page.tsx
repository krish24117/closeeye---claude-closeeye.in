import type { Metadata } from 'next'
import Link from 'next/link'

const TITLE = 'Terms of Service — Close Eye'
const DESCRIPTION = 'Terms of service for booking and using Close Eye companion visits.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/terms', images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`/api/og?title=${encodeURIComponent(TITLE)}`] },
}

export default function TermsPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">Terms of Service</h1>
        <p className="text-white/65 text-sm">Last updated: June 2026</p>
      </div>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-8 text-gray-600 text-sm sm:text-base leading-relaxed">

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">1. Service description</h2>
            <p>Close Eye (a brand of Stexa Products & Services Pvt. Ltd.) provides a platform connecting NRI families with verified local companions in India for elderly wellbeing visits, hospital accompaniment, and emergency support. We are not a medical service, healthcare provider, or emergency response service.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">2. Eligibility</h2>
            <p>You must be 18 years or older to use Close Eye. By registering, you confirm that the information you provide is accurate and that you have the authority to arrange care visits for your loved one.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">3. Companion visits</h2>
            <p>Companions are independent, verified individuals coordinated by Close Eye. They are not employees of Close Eye. While we conduct thorough background checks, we cannot guarantee the outcome of every visit. Companions will not:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Handle cash on behalf of your family</li>
              <li>Hold property keys unsupervised</li>
              <li>Provide medical treatment or advice</li>
              <li>Make financial decisions on your loved one&apos;s behalf</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">4. Payments</h2>
            <p>All payments are processed through <strong>Razorpay</strong> (UPI, credit/debit card, net banking). Prices are listed in Indian Rupees (INR) inclusive of applicable taxes. GST invoices are provided for every transaction. Close Eye reserves the right to update pricing with 30 days&apos; notice.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">5. Cancellations and refunds</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>24+ hours before visit:</strong> Full refund</li>
              <li><strong>Less than 24 hours:</strong> Credit toward future visit</li>
              <li><strong>Emergency visits once dispatched:</strong> Non-refundable</li>
              <li><strong>Monthly/quarterly plans:</strong> Can be paused up to 30 days per cycle</li>
            </ul>
            <p className="mt-3">Refunds are processed within 5–7 business days to the original payment method.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">6. Limitation of liability</h2>
            <p>Close Eye facilitates companion visits but is not liable for any loss, injury, or damage arising from companion visits. In no event shall our liability exceed the amount paid for the specific visit in question. We are not liable for force majeure events including natural disasters, civil unrest, or pandemic-related disruptions.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">7. Governing law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in <strong>Hyderabad, Telangana</strong>.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">8. Contact</h2>
            <p>
              <strong>Stexa Products & Services Pvt. Ltd.</strong><br />
              Hyderabad, Telangana, India<br />
              <a href="mailto:hello@closeeye.in" className="text-green-700 underline">hello@closeeye.in</a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 flex-wrap">
          <Link href="/privacy-policy" className="text-sm text-green-700 hover:underline">Privacy Policy →</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-green-700">← Back to Home</Link>
        </div>
      </section>
    </main>
  )
}
