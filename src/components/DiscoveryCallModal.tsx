import { useState, FormEvent, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const COUNTRY_CODES = [
  { flag: '🇮🇳', dial: '+91',  name: 'India',        minDigits: 10 },
  { flag: '🇺🇸', dial: '+1',   name: 'United States', minDigits: 10 },
  { flag: '🇬🇧', dial: '+44',  name: 'United Kingdom', minDigits: 10 },
  { flag: '🇦🇪', dial: '+971', name: 'UAE',           minDigits: 9  },
  { flag: '🇦🇺', dial: '+61',  name: 'Australia',     minDigits: 9  },
  { flag: '🇨🇦', dial: '+1',   name: 'Canada',        minDigits: 10 },
  { flag: '🇸🇬', dial: '+65',  name: 'Singapore',     minDigits: 8  },
  { flag: '🇩🇪', dial: '+49',  name: 'Germany',       minDigits: 10 },
  { flag: '🇸🇦', dial: '+966', name: 'Saudi Arabia',  minDigits: 9  },
  { flag: '🇶🇦', dial: '+974', name: 'Qatar',         minDigits: 8  },
  { flag: '🇳🇿', dial: '+64',  name: 'New Zealand',   minDigits: 9  },
  { flag: '🇳🇱', dial: '+31',  name: 'Netherlands',   minDigits: 9  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function DiscoveryCallModal({ open, onClose }: Props) {
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [dialCode, setDialCode]   = useState('+91')
  const [city, setCity]           = useState('')
  const [note, setNote]           = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setName(''); setPhone(''); setDialCode('+91'); setCity(''); setNote('')
    setStatus('idle'); setErr('')
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !city.trim()) {
      setErr('Please fill in Name, WhatsApp number, and City.')
      return
    }
    const digits = phone.replace(/\D/g, '')
    const country = COUNTRY_CODES.find(c => c.dial === dialCode) ?? COUNTRY_CODES[0]
    if (digits.length < country.minDigits) {
      setErr(`Please enter a valid WhatsApp number for ${country.name}.`)
      return
    }
    setStatus('busy'); setErr('')
    const waNumber = `${dialCode}${digits}`
    try {
      const { error } = await supabase.functions.invoke('waitlist-signup', {
        body: {
          full_name: name.trim(),
          email: `${digits.slice(-10)}@discovery.closeeye.in`,
          whatsapp_number: waNumber,
          loved_one_city: city.trim(),
          support_needed: note.trim() || undefined,
          urgency: 'sales_call',
        },
      })
      if (error) throw error
      setStatus('ok')
    } catch {
      setStatus('err')
      setErr('Something went wrong — please try again, or WhatsApp us at +91 90002 21261.')
    }
  }

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(14,42,31,0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'ce-modal-bg 200ms ease both',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Book Free Discovery Call"
    >
      <style>{`
        @keyframes ce-modal-bg   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ce-modal-card { from { opacity: 0; transform: translateY(24px) scale(.97) } to { opacity: 1; transform: none } }
        .ce-dc-form input,
        .ce-dc-form textarea {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1.5px solid #e3ddd1;
          background: #FAF7F2;
          font-family: 'Open Sauce One', system-ui, sans-serif;
          font-size: 15px;
          color: #1D1D1F;
          outline: none;
          transition: border-color 180ms;
          -webkit-appearance: none;
        }
        .ce-dc-form input:focus,
        .ce-dc-form textarea:focus { border-color: #0E2A1F; }
        .ce-dc-form input::placeholder,
        .ce-dc-form textarea::placeholder { color: #aaa; }
        .ce-dc-form label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: #3A3A3C;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 7px;
          font-family: 'Open Sauce One', system-ui, sans-serif;
        }
        .ce-dc-field { margin-bottom: 16px; }
        .ce-dc-phone-row { display: flex; gap: 8px; }
        .ce-dc-phone-select {
          padding: 13px 10px;
          border-radius: 12px;
          border: 1.5px solid #e3ddd1;
          background: #f1ece2;
          font-size: 14px;
          color: #3A3A3C;
          font-family: 'Open Sauce One', system-ui, sans-serif;
          flex-shrink: 0;
          cursor: pointer;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          min-width: 96px;
          transition: border-color 180ms;
        }
        .ce-dc-phone-select:focus { border-color: #0E2A1F; }
        .ce-dc-phone-row input { flex: 1; }
        .ce-dc-submit {
          width: 100%;
          padding: 15px;
          border-radius: 100px;
          border: none;
          background: linear-gradient(135deg, #1c4a35, #0E2A1F);
          color: #FAF7F2;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          font-family: 'Open Sauce One', system-ui, sans-serif;
          letter-spacing: -0.01em;
          transition: opacity 200ms, transform 200ms;
        }
        .ce-dc-submit:hover { opacity: .92; transform: translateY(-1px); }
        .ce-dc-submit:disabled { opacity: .55; cursor: not-allowed; transform: none; }
      `}</style>

      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 32px 80px rgba(14,42,31,0.35)',
          animation: 'ce-modal-card 260ms cubic-bezier(.22,1,.36,1) both',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1c4a35 0%, #0E2A1F 100%)',
          padding: '28px 28px 24px',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.13)',
              border: 'none', borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#FAF7F2',
              transition: 'background 150ms',
            }}
          >
            <X size={16} />
          </button>
          <p style={{
            fontSize: '11px', letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#A8D5B5',
            fontWeight: 600, marginBottom: '8px',
            fontFamily: "'Open Sauce One', system-ui, sans-serif",
          }}>
            Free — no commitment
          </p>
          <h2 style={{
            fontSize: '23px', fontWeight: 800,
            color: '#FAF7F2', lineHeight: 1.2,
            margin: 0, letterSpacing: '-0.02em',
            fontFamily: "'Open Sauce One', system-ui, sans-serif",
          }}>
            Let's talk about<br />your family.
          </h2>
          <p style={{
            fontSize: '13.5px',
            color: 'rgba(250,247,242,0.70)',
            marginTop: '8px', lineHeight: 1.55,
            fontFamily: "'Open Sauce One', system-ui, sans-serif",
          }}>
            Tell us a little about your parent — we'll WhatsApp you within 24 hours.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px' }}>
          {status === 'ok' ? (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1c4a35, #0E2A1F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <Check size={30} color="#A8D5B5" strokeWidth={2.5} />
              </div>
              <h3 style={{
                fontSize: '20px', fontWeight: 800,
                color: '#0E2A1F', marginBottom: '10px',
                fontFamily: "'Open Sauce One', system-ui, sans-serif",
                letterSpacing: '-0.02em',
              }}>
                We've received your request
              </h3>
              <p style={{
                fontSize: '14.5px', color: '#5c6b62',
                lineHeight: 1.6, maxWidth: '300px',
                margin: '0 auto 26px',
                fontFamily: "'Open Sauce One', system-ui, sans-serif",
              }}>
                Our team will WhatsApp you within 24 hours to find the best care plan for your family.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#0E2A1F', color: '#FAF7F2',
                  fontWeight: 700, padding: '13px 32px',
                  borderRadius: '100px', border: 'none',
                  cursor: 'pointer', fontSize: '15px',
                  fontFamily: "'Open Sauce One', system-ui, sans-serif",
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form className="ce-dc-form" onSubmit={submit} noValidate>
              <div className="ce-dc-field">
                <label>Your name *</label>
                <input
                  type="text"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="ce-dc-field">
                <label>WhatsApp number *</label>
                <div className="ce-dc-phone-row">
                  <select
                    className="ce-dc-phone-select"
                    value={dialCode}
                    onChange={e => setDialCode(e.target.value)}
                    aria-label="Country code"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={`${c.dial}-${c.name}`} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="90000 00000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="ce-dc-field">
                <label>Parent's city in India *</label>
                <input
                  type="text"
                  placeholder="Hyderabad, Mumbai, Chennai…"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="ce-dc-field" style={{ marginBottom: '22px' }}>
                <label>
                  Anything we should know?{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#aaa', fontSize: '11px' }}>
                    optional
                  </span>
                </label>
                <textarea
                  placeholder={`e.g. "Mum lives alone, has diabetes, and we're in the US."`}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              {err && (
                <p style={{
                  fontSize: '13px', color: '#c0734f',
                  marginBottom: '14px', lineHeight: 1.5,
                  fontFamily: "'Open Sauce One', system-ui, sans-serif",
                }}>
                  {err}
                </p>
              )}

              <button type="submit" className="ce-dc-submit" disabled={status === 'busy'}>
                {status === 'busy' ? 'Sending…' : 'Send my request →'}
              </button>

              <p style={{
                fontSize: '11.5px', color: '#aaa',
                textAlign: 'center', marginTop: '12px',
                lineHeight: 1.55,
                fontFamily: "'Open Sauce One', system-ui, sans-serif",
              }}>
                We only use your details to contact you. We never share them.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
