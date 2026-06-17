import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react'

export function ContactPage() {
  return (
    <main>
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Contact</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">We'd love to hear from your family.</h1>
        <p className="text-white/65 text-sm sm:text-base">Reach us by WhatsApp or email — we respond within one business day.</p>
      </div>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">

          <a
            href="mailto:hello@closeeye.in"
            className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl hover:shadow-md transition-shadow group"
          >
            <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm mb-0.5">Email us</p>
              <p className="text-sm font-medium text-green-700 break-all">hello@closeeye.in</p>
              <p className="text-xs text-gray-400 mt-1">We reply within one business day.</p>
            </div>
          </a>

          <a
            href="https://wa.me/919000221261"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl hover:shadow-md transition-shadow group"
          >
            <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm mb-0.5">WhatsApp</p>
              <p className="text-sm font-medium text-green-700">+91 90002 21261</p>
              <p className="text-xs text-gray-400 mt-1">Fastest way to reach us.</p>
            </div>
          </a>

          <a
            href="tel:+919000221261"
            className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl hover:shadow-md transition-shadow group"
          >
            <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm mb-0.5">Phone</p>
              <p className="text-sm font-medium text-green-700">+91 90002 21261</p>
              <p className="text-xs text-gray-400 mt-1">Mon – Sat, 9 am to 7 pm IST.</p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl">
            <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm mb-0.5">Office address</p>
              <p className="text-sm font-medium text-green-700">Hyderabad, Telangana</p>
              <p className="text-xs text-gray-400 mt-1">Stexa Products &amp; Services Pvt. Ltd.<br />India — 500001</p>
            </div>
          </div>
        </div>

        {/* Business info for Razorpay / compliance */}
        <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50">
          <h2 className="font-semibold text-green-900 text-sm mb-3">Business details</h2>
          <dl className="space-y-2 text-sm text-gray-600">
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Legal name:</dt><dd>Stexa Products &amp; Services Pvt. Ltd.</dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Brand:</dt><dd>Close Eye</dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Website:</dt><dd>www.closeeye.in</dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Email:</dt><dd><a href="mailto:hello@closeeye.in" className="text-green-700 hover:underline">hello@closeeye.in</a></dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Phone:</dt><dd><a href="tel:+919000221261" className="text-green-700 hover:underline">+91 90002 21261</a></dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Location:</dt><dd>Hyderabad, Telangana, India</dd></div>
            <div className="flex gap-2"><dt className="font-medium text-gray-700 w-36 flex-shrink-0">Service area:</dt><dd>Hyderabad (expanding across India)</dd></div>
          </dl>
        </div>

        <div className="mt-10 flex gap-4 flex-wrap">
          <Link to="/services" className="text-sm text-green-700 hover:underline">View our services →</Link>
          <Link to="/faq" className="text-sm text-gray-400 hover:text-green-700">FAQ →</Link>
        </div>
      </section>
    </main>
  )
}
