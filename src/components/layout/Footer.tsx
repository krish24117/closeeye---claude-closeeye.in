import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { FaInstagram, FaLinkedin, FaFacebook, FaWhatsapp } from 'react-icons/fa'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WHATSAPP_MESSAGE = "Hi, I'm interested in Close Eye companion visits for my parents"

const SOCIAL = [
  { icon: FaInstagram, href: 'https://www.instagram.com/closeeyeglobal/',          label: 'Instagram' },
  { icon: FaLinkedin,  href: 'https://www.linkedin.com/company/closeeye/',         label: 'LinkedIn'  },
  { icon: FaFacebook,  href: 'https://www.facebook.com/closeeyeglobal',            label: 'Facebook'  },
  { icon: FaWhatsapp,  href: `https://wa.me/${WHATSAPP_NUMBER}`,                   label: 'WhatsApp'  },
]

export function Footer() {
  return (
    <footer className="bg-green-900 text-white/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo className="w-8 h-8 flex-shrink-0" />
              <p className="font-serif text-xl text-white">close <span className="text-green-300">eye</span></p>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Verified wellbeing visits and trusted local support for your loved ones in India. When you can't be there, Close Eye can.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              +91 90002 21261
            </a>

            {/* Social icons */}
            <div className="flex items-center gap-4 mt-5">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-white/70 hover:text-white transition-opacity"
                >
                  <Icon size={24} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Company</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/companions" className="hover:text-white transition-colors">Our Companions</Link></li>
              {/* <li><Link to="/for-societies" className="hover:text-white transition-colors">For Societies</Link></li> */}
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Legal</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Get started</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/auth?mode=signup" className="hover:text-white transition-colors">Register Your Family</Link></li>
              <li><Link to="/join-as-companion" className="hover:text-white transition-colors">Become a Companion</Link></li>
              <li><Link to="/auth" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Book a call</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs gap-2 text-center sm:text-left">
          <span>Operated by Stexa Products &amp; Services Pvt. Ltd., Hyderabad</span>
          <span>© 2026 Close Eye. All rights reserved.</span>
        </div>
      </div>

      {/* WhatsApp float */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Close Eye on WhatsApp"
        title="Chat on WhatsApp"
        className="fixed bottom-6 right-4 sm:right-6 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 animate-pulse transition-transform z-50"
        style={{ width: '56px', height: '56px' }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </footer>
  )
}
