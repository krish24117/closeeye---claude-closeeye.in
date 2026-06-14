// src/pages/Contact.tsx
export function ContactPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-6 py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Contact</p>
        <h1 className="font-serif text-4xl mb-4">We'd love to hear from your family.</h1>
        <p className="text-white/65">We respond within one business day.</p>
      </div>
      <section className="max-w-3xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { icon:'✉️', title:'Email us', sub:'hello@closeeye.in', desc:'We reply within one business day.', href:'mailto:hello@closeeye.in' },
          { icon:'💬', title:'WhatsApp', sub:'+91 90002 21261', desc:'Fastest way to reach us.', href:'https://wa.me/919000221261' },
          { icon:'📅', title:'Book a call', sub:'15-min consultation', desc:'Talk to our team directly.', href:'/waitlist' },
          { icon:'📍', title:'Based in', sub:'Hyderabad, India', desc:'Stexa Products & Services Pvt. Ltd.', href:null },
        ].map(c=>(
          c.href
            ? <a key={c.title} href={c.href} className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl hover:shadow-card transition-shadow group">
                <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{c.icon}</div>
                <div><p className="font-semibold text-green-900 text-sm mb-0.5">{c.title}</p><p className="text-sm font-medium text-green-700">{c.sub}</p><p className="text-xs text-gray-400 mt-1">{c.desc}</p></div>
              </a>
            : <div key={c.title} className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl">
                <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{c.icon}</div>
                <div><p className="font-semibold text-green-900 text-sm mb-0.5">{c.title}</p><p className="text-sm font-medium text-green-700">{c.sub}</p><p className="text-xs text-gray-400 mt-1">{c.desc}</p></div>
              </div>
        ))}
      </section>
    </main>
  )
}
