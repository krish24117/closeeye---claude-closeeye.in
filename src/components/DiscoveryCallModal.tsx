import { useState, FormEvent, useEffect } from 'react'
import { X, Check, ChevronDown, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const COUNTRY_CODES = [
  { flag: '🇮🇳', dial: '+91',  name: 'India',         minDigits: 10 },
  { flag: '🇺🇸', dial: '+1',   name: 'United States',  minDigits: 10 },
  { flag: '🇬🇧', dial: '+44',  name: 'United Kingdom', minDigits: 10 },
  { flag: '🇦🇪', dial: '+971', name: 'UAE',            minDigits: 9  },
  { flag: '🇦🇺', dial: '+61',  name: 'Australia',      minDigits: 9  },
  { flag: '🇨🇦', dial: '+1',   name: 'Canada',         minDigits: 10 },
  { flag: '🇸🇬', dial: '+65',  name: 'Singapore',      minDigits: 8  },
  { flag: '🇩🇪', dial: '+49',  name: 'Germany',        minDigits: 10 },
  { flag: '🇸🇦', dial: '+966', name: 'Saudi Arabia',   minDigits: 9  },
  { flag: '🇶🇦', dial: '+974', name: 'Qatar',          minDigits: 8  },
  { flag: '🇳🇿', dial: '+64',  name: 'New Zealand',    minDigits: 9  },
  { flag: '🇳🇱', dial: '+31',  name: 'Netherlands',    minDigits: 9  },
]

const CSS = `
@keyframes dc-bg-in {
  from { opacity: 0 }
  to   { opacity: 1 }
}
@keyframes dc-card-in {
  from { opacity: 0; transform: translateY(28px) scale(.97) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}
@keyframes dc-sheet-in {
  from { transform: translateY(100%) }
  to   { transform: translateY(0) }
}
@keyframes dc-success-in {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes dc-ring-pop {
  0%   { opacity: 0; transform: scale(.5) }
  70%  { transform: scale(1.08) }
  100% { opacity: 1; transform: scale(1) }
}
@keyframes dc-spin {
  to { transform: rotate(360deg) }
}

.ce-dc-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(6,16,11,.80);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: dc-bg-in 200ms ease both;
}

.ce-dc-card {
  position: relative;
  background: #F9F8F5;
  border-radius: 28px;
  width: 100%;
  max-width: 444px;
  box-shadow:
    0 2px 4px rgba(0,0,0,.04),
    0 8px 24px rgba(0,0,0,.10),
    0 32px 80px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.80);
  animation: dc-card-in 400ms cubic-bezier(.22,1,.36,1) both;
  max-height: 94vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 500px) {
  .ce-dc-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .ce-dc-card {
    border-radius: 28px 28px 0 0;
    max-width: 100%;
    max-height: 96vh;
    animation-name: dc-sheet-in;
    animation-timing-function: cubic-bezier(.32,1,.28,1);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

.ce-dc-close {
  position: absolute;
  top: 16px; right: 16px;
  width: 34px; height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,.07);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6E6E73;
  transition: background 140ms;
  z-index: 2;
  -webkit-appearance: none;
}
.ce-dc-close:hover { background: rgba(0,0,0,.13) }

.ce-dc-hero {
  padding: 40px 28px 20px;
}

.ce-dc-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 13px;
  background: rgba(168,213,186,.22);
  border: 1px solid rgba(11,79,58,.20);
  border-radius: 100px;
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  color: #0B4F3A;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.ce-dc-title {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #111;
  line-height: 1.11;
  letter-spacing: -0.04em;
  margin: 0 0 14px;
}

.ce-dc-sub {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 15px;
  color: #6E6E73;
  line-height: 1.62;
  margin: 0;
  max-width: 320px;
}

.ce-dc-form {
  padding: 8px 28px 36px;
}

.ce-dc-field {
  position: relative;
  margin-bottom: 12px;
}

/* Base input — tall with top-weighted padding for floating label */
.ce-dc-input {
  display: block;
  width: 100%;
  height: 58px;
  padding: 22px 16px 8px;
  border: 1.5px solid #E4DFD6;
  border-radius: 14px;
  background: #FFFFFF;
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #111;
  outline: none;
  transition: border-color 180ms, box-shadow 180ms;
  -webkit-appearance: none;
  box-sizing: border-box;
}
.ce-dc-input::placeholder { color: transparent }

.ce-dc-input.focused {
  border-color: #0B4F3A;
  box-shadow: 0 0 0 3.5px rgba(11,79,58,.11);
}
.ce-dc-input.focused::placeholder {
  color: #C8C8CC;
  transition: color 100ms 100ms;
}

/* Floating label — sits at vertical center until input is active/filled */
.ce-dc-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: #AEAEB2;
  pointer-events: none;
  transition:
    top 190ms cubic-bezier(.4,0,.2,1),
    font-size 190ms cubic-bezier(.4,0,.2,1),
    font-weight 190ms,
    letter-spacing 190ms,
    color 190ms;
  white-space: nowrap;
}

.ce-dc-input.focused ~ .ce-dc-label,
.ce-dc-input.has-val ~ .ce-dc-label {
  top: 11px;
  transform: translateY(0);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #0B4F3A;
}

.ce-dc-input.has-val:not(.focused) ~ .ce-dc-label {
  color: #8A8A8E;
}

/* Country code pill (decorative, sits over input left) */
.ce-dc-cc-pill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 92px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 14px;
  pointer-events: none;
  z-index: 1;
}
.ce-dc-cc-pill::after {
  content: '';
  position: absolute;
  right: 0; top: 14px; bottom: 14px;
  width: 1px;
  background: #E4DFD6;
  transition: background 180ms;
}
.ce-dc-phone-input.focused ~ .ce-dc-cc-pill::after,
.ce-dc-field:focus-within .ce-dc-cc-pill::after {
  background: rgba(11,79,58,.25);
}

.ce-dc-cc-flag { font-size: 19px; line-height: 1; margin-top: 1px }
.ce-dc-cc-code {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: #3A3A3C;
}

/* Invisible native select covers the pill — tap it to change country */
.ce-dc-cc-native {
  position: absolute;
  left: 0; top: 0;
  width: 92px;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
  -webkit-appearance: none;
}

.ce-dc-phone-input {
  padding-left: 100px !important;
}

.ce-dc-phone-label {
  left: 100px !important;
}

/* Submit */
.ce-dc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 58px;
  border-radius: 100px;
  border: none;
  background: #0B4F3A;
  color: #FAF8F5;
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: transform 140ms cubic-bezier(.4,0,.2,1), box-shadow 140ms;
  margin-top: 10px;
  box-shadow: 0 4px 18px rgba(11,79,58,.38);
  -webkit-appearance: none;
}
.ce-dc-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(11,79,58,.46);
}
.ce-dc-btn:active:not(:disabled) {
  transform: scale(.983);
  box-shadow: 0 2px 10px rgba(11,79,58,.30);
}
.ce-dc-btn:disabled { opacity: .52; cursor: not-allowed }

.ce-dc-btn-outline {
  background: transparent;
  color: #0B4F3A;
  box-shadow: none;
  border: 1.5px solid rgba(11,79,58,.28);
}
.ce-dc-btn-outline:hover:not(:disabled) {
  background: rgba(11,79,58,.06);
  box-shadow: none;
  transform: none;
}

.ce-dc-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid rgba(250,248,245,.30);
  border-top-color: #FAF8F5;
  border-radius: 50%;
  animation: dc-spin 0.65s linear infinite;
}

.ce-dc-err {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 13px;
  color: #C07050;
  line-height: 1.5;
  margin: 4px 0 10px;
}

.ce-dc-trust {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 11.5px;
  color: #BCBCC0;
  text-align: center;
  margin: 12px 0 0;
  line-height: 1.55;
}

/* Success state */
.ce-dc-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 52px 32px 48px;
  animation: dc-success-in 420ms cubic-bezier(.22,1,.36,1) both;
}

.ce-dc-success-ring {
  width: 84px; height: 84px;
  border-radius: 50%;
  background: rgba(168,213,186,.20);
  border: 1.5px solid rgba(11,79,58,.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  animation: dc-ring-pop 520ms cubic-bezier(.34,1.56,.64,1) 60ms both;
}

.ce-dc-success-title {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.04em;
  margin: 0 0 14px;
  line-height: 1.1;
}

.ce-dc-success-body {
  font-family: 'Open Sauce One', system-ui, sans-serif;
  font-size: 15px;
  color: #6E6E73;
  line-height: 1.65;
  margin: 0 0 36px;
  max-width: 310px;
}
`

interface Props {
  open: boolean
  onClose: () => void
}

export function DiscoveryCallModal({ open, onClose }: Props) {
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [dialCode, setDialCode] = useState('+91')
  const [city, setCity]         = useState('')
  const [status, setStatus]     = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')
  const [err, setErr]           = useState('')
  const [focused, setFocused]   = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    setName(''); setPhone(''); setDialCode('+91'); setCity('')
    setStatus('idle'); setErr(''); setFocused({})
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const fo  = (k: string) => setFocused(f => ({ ...f, [k]: true  }))
  const bl  = (k: string) => setFocused(f => ({ ...f, [k]: false }))
  const cls = (k: string, v: string) =>
    `ce-dc-input${focused[k] ? ' focused' : ''}${v.length > 0 ? ' has-val' : ''}`

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !city.trim()) {
      setErr('Please fill in your name, WhatsApp number, and city.')
      return
    }
    const digits  = phone.replace(/\D/g, '')
    const country = COUNTRY_CODES.find(c => c.dial === dialCode) ?? COUNTRY_CODES[0]
    if (digits.length < country.minDigits) {
      setErr(`Please enter a valid ${country.name} WhatsApp number.`)
      return
    }
    setStatus('busy'); setErr('')
    try {
      const { error } = await supabase.functions.invoke('waitlist-signup', {
        body: {
          full_name:       name.trim(),
          email:           `${digits.slice(-10)}@discovery.closeeye.in`,
          whatsapp_number: `${dialCode}${digits}`,
          loved_one_city:  city.trim(),
          urgency:         'sales_call',
        },
      })
      if (error) throw error
      setStatus('ok')
    } catch {
      setStatus('err')
      setErr('Something went wrong — please try again or WhatsApp us at +91 90002 21261.')
    }
  }

  if (!open) return null

  const selectedCountry = COUNTRY_CODES.find(c => c.dial === dialCode) ?? COUNTRY_CODES[0]

  return (
    <div
      className="ce-dc-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Book a free discovery call"
    >
      <style>{CSS}</style>

      <div className="ce-dc-card">
        <button type="button" onClick={onClose} className="ce-dc-close" aria-label="Close">
          <X size={17} strokeWidth={2} />
        </button>

        {status === 'ok' ? (
          <SuccessView onClose={onClose} />
        ) : (
          <>
            <div className="ce-dc-hero">
              <span className="ce-dc-badge">Free · No commitment</span>
              <h2 className="ce-dc-title">
                Let's find care<br />for your parent.
              </h2>
              <p className="ce-dc-sub">
                Tell us about your family. We'll WhatsApp you within 24 hours.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="ce-dc-form">

              {/* Name */}
              <div className="ce-dc-field">
                <input
                  type="text"
                  className={cls('name', name)}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => fo('name')}
                  onBlur={() => bl('name')}
                  autoComplete="name"
                  autoCapitalize="words"
                />
                <label className="ce-dc-label">Your name</label>
              </div>

              {/* WhatsApp */}
              <div className="ce-dc-field">
                <div className="ce-dc-cc-pill" aria-hidden="true">
                  <span className="ce-dc-cc-flag">{selectedCountry.flag}</span>
                  <span className="ce-dc-cc-code">{dialCode}</span>
                  <ChevronDown size={11} strokeWidth={2.5} color="#8A8A8E" />
                </div>
                <select
                  className="ce-dc-cc-native"
                  value={dialCode}
                  onChange={e => setDialCode(e.target.value)}
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={`${c.dial}-${c.name}`} value={c.dial}>
                      {c.flag} {c.dial} — {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={`${cls('phone', phone)} ce-dc-phone-input`}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onFocus={() => fo('phone')}
                  onBlur={() => bl('phone')}
                  placeholder={focused['phone'] || phone.length > 0 ? '90000 00000' : ''}
                  inputMode="tel"
                  autoComplete="tel"
                />
                <label className="ce-dc-label ce-dc-phone-label">WhatsApp number</label>
              </div>

              {/* City */}
              <div className="ce-dc-field" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  className={cls('city', city)}
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onFocus={() => fo('city')}
                  onBlur={() => bl('city')}
                  placeholder={focused['city'] || city.length > 0 ? 'Hyderabad, Mumbai, Chennai…' : ''}
                  autoCapitalize="words"
                />
                <label className="ce-dc-label">Parent's city in India</label>
              </div>

              {err && <p className="ce-dc-err">{err}</p>}

              <button type="submit" className="ce-dc-btn" disabled={status === 'busy'}>
                {status === 'busy' ? (
                  <span className="ce-dc-spinner" />
                ) : (
                  <>
                    <span>Request a call</span>
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>

              <p className="ce-dc-trust">
                We only use your details to contact you. Never shared.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="ce-dc-success">
      <div className="ce-dc-success-ring">
        <Check size={38} strokeWidth={2.5} color="#0B4F3A" />
      </div>
      <h3 className="ce-dc-success-title">We'll be in touch.</h3>
      <p className="ce-dc-success-body">
        Our care team will WhatsApp you within 24 hours to understand your family's needs and find the right plan.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="ce-dc-btn ce-dc-btn-outline"
        style={{ maxWidth: 200 }}
      >
        Done
      </button>
    </div>
  )
}
