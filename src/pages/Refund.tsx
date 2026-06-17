import { Link } from 'react-router-dom'

export function RefundPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">Refund &amp; Cancellation Policy</h1>
        <p className="text-white/65 text-sm">Last updated: June 2026</p>
      </div>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-8 text-gray-600 text-sm sm:text-base leading-relaxed">

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">Overview</h2>
            <p>Close Eye (a brand of <strong>Stexa Products &amp; Services Pvt. Ltd.</strong>) is committed to fair and transparent refunds. This policy applies to all bookings and subscriptions made through closeeye.in. Payments are processed by <strong>Razorpay</strong>.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">1. Single / one-off visits</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cancelled 24+ hours before the scheduled visit:</strong> Full refund to original payment method within 5–7 business days.</li>
              <li><strong>Cancelled less than 24 hours before the visit:</strong> 100% credit toward any future visit. No cash refund.</li>
              <li><strong>Cancelled after the companion has departed for the visit:</strong> Non-refundable. A written summary report will still be provided.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">2. Emergency visits</h2>
            <p>Emergency visits are non-refundable once the companion has been dispatched, due to the priority allocation of companion resources. If the visit is cancelled before dispatch, a full refund is issued.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">3. Monthly subscription plans</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cancellation before the cycle begins:</strong> Full refund of the monthly fee.</li>
              <li><strong>Cancellation mid-cycle:</strong> Pro-rated refund for unused visits, minus any visits already completed.</li>
              <li><strong>Pause option:</strong> Subscriptions can be paused for up to 30 days per billing cycle — unused visits are carried forward.</li>
              <li><strong>Annual plans:</strong> Refund calculated on unused months at the monthly plan rate.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">4. Companion no-show</h2>
            <p>If a companion fails to arrive for a scheduled visit with no prior notice from Close Eye, the booking is either:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Rescheduled at no extra cost at your preferred time, or</li>
              <li>Fully refunded to the original payment method within 3 business days.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">5. How to request a refund</h2>
            <p>To request a refund or cancellation, contact us via:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Email: <a href="mailto:tech.closeeye@gmail.com" className="text-green-700 underline">tech.closeeye@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/919000221261" className="text-green-700 underline">+91 90002 21261</a></li>
            </ul>
            <p className="mt-3">Please include your booking ID (found in your dashboard), the name of the loved one, and the reason for cancellation. We will acknowledge within 24 hours.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">6. Refund timeline</h2>
            <p>Approved refunds are processed within <strong>5–7 business days</strong> to the original payment method (UPI, credit/debit card, or net banking via Razorpay). Processing times may vary by bank.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">7. Contact</h2>
            <p>
              <strong>Stexa Products &amp; Services Pvt. Ltd.</strong><br />
              Hyderabad, Telangana, India<br />
              <a href="mailto:tech.closeeye@gmail.com" className="text-green-700 underline">tech.closeeye@gmail.com</a><br />
              <a href="tel:+919000221261" className="text-green-700 underline">+91 90002 21261</a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 flex-wrap">
          <Link to="/terms" className="text-sm text-green-700 hover:underline">Terms of Service →</Link>
          <Link to="/privacy-policy" className="text-sm text-green-700 hover:underline">Privacy Policy →</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-green-700">← Back to Home</Link>
        </div>
      </section>
    </main>
  )
}
