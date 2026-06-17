// src/pages/Privacy.tsx
import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">Privacy Policy</h1>
        <p className="text-white/65 text-sm">Last updated: June 2026</p>
      </div>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="prose prose-green max-w-none space-y-8 text-gray-600 text-sm sm:text-base leading-relaxed">

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">1. Who we are</h2>
            <p>Close Eye is a brand of <strong>Stexa Products & Services Pvt. Ltd.</strong>, registered in Hyderabad, Telangana, India. We operate the platform at closeeye.in which connects NRI families with verified local companions for elderly wellbeing visits.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">2. What we collect</h2>
            <p>We collect the following information when you use Close Eye:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your name, email address, and WhatsApp number</li>
              <li>Your country of residence</li>
              <li>Your loved one's name, address, city, and health notes</li>
              <li>Emergency contact information you provide</li>
              <li>Booking details and payment transaction records</li>
              <li>Visit reports, photos, and companion notes</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">3. How we use your data</h2>
            <p>We use your information only to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Match and coordinate companion visits for your loved one</li>
              <li>Deliver visit reports and photos to registered family contacts</li>
              <li>Process payments securely through Razorpay</li>
              <li>Send you booking confirmations and visit updates</li>
              <li>Improve our service quality</li>
            </ul>
            <p className="mt-3">We do not sell your data to any third party. Ever.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">4. Who sees your data</h2>
            <p>Visit reports and your loved one's information are shared only with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The assigned companion (limited to what they need for the visit)</li>
              <li>Family contacts you have registered on the platform</li>
              <li>Our internal team for quality and support purposes</li>
            </ul>
            <p className="mt-3">Companions sign a strict confidentiality agreement before joining our network.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">5. Data security</h2>
            <p>Your data is stored on Supabase (PostgreSQL) with row-level security enabled. All data in transit is encrypted via HTTPS/TLS. Payments are processed by Razorpay and we never store card or payment details on our servers.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">6. Your rights</h2>
            <p>You can request to view, update, or delete your data at any time by emailing us at <a href="mailto:tech.closeeye@gmail.com" className="text-green-700 underline">tech.closeeye@gmail.com</a>. We will respond within 7 business days.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">7. Cookies</h2>
            <p>We use essential cookies only — for authentication and session management. We do not use advertising or tracking cookies.</p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-green-900 mb-3">8. Contact</h2>
            <p>For any privacy-related queries, contact us at:<br />
              <strong>Stexa Products & Services Pvt. Ltd.</strong><br />
              Hyderabad, Telangana, India<br />
              <a href="mailto:tech.closeeye@gmail.com" className="text-green-700 underline">tech.closeeye@gmail.com</a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 flex-wrap">
          <Link to="/terms" className="text-sm text-green-700 hover:underline">Terms of Service →</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-green-700">← Back to Home</Link>
        </div>
      </section>
    </main>
  )
}
