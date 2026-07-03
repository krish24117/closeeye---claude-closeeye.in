import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface Service { id: string; emoji: string; name: string; price: string; desc: string }

const SERVICES: Service[] = [
  { id: 'home_visit',                    emoji: '🏠', name: 'Home Visit',            price: '₹1,000', desc: 'Companion visit + WhatsApp report' },
  { id: 'doctor_visit_support',          emoji: '👨‍⚕️', name: 'Doctor Visit Support',  price: '₹1,500', desc: 'Accompanies them to the doctor + notes' },
  { id: 'hospital_assistance_half_day',  emoji: '🏥', name: 'Hospital Half Day',     price: '₹2,000', desc: 'Up to 4 hours hospital support' },
  { id: 'hospital_assistance_full_day',  emoji: '🏥', name: 'Hospital Full Day',     price: '₹4,000', desc: 'Full day. Updated every 2 hours' },
  { id: 'emergency_support_visit',       emoji: '🚨', name: 'Emergency Visit',       price: '₹3,000', desc: 'Response within 2 hours' },
  { id: 'grocery_medicine_assistance',   emoji: '🛒', name: 'Grocery & Medicine',    price: '₹500',   desc: 'Collection and delivery' },
  { id: 'home_maintenance_coordination', emoji: '🔧', name: 'Home Maintenance',      price: '₹500',   desc: 'Coordinate repairs' },
]

export function DashboardBook() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'
  const isFoundingMember = !!((profile as unknown) as Record<string, unknown>)?.is_founding_member
  const foundingNumber = ((profile as unknown) as Record<string, unknown>)?.founding_number as number | undefined

  const [recipientName, setRecipientName] = useState('')

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('full_name').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        .then(({ data }) => setRecipientName(data?.full_name || profile?.full_name || ''))
    } else {
      supabase.from('society_members').select('name').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setRecipientName(data?.name || profile?.full_name || ''))
    }
  }, [user, isNri, profile])

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 4px', letterSpacing: '-0.02em' }}>Book a Service</h1>
      <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 16px 16px' }}>
        {isNri ? `For ${recipientName || 'your loved one'} · Hyderabad` : 'For your family · Hyderabad'}
      </p>

      {isFoundingMember && (
        <div style={{ margin: '0 16px 14px', background: 'rgba(14,42,31,0.06)', border: '1px solid rgba(14,42,31,0.12)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>Founding Family{foundingNumber ? ` #${foundingNumber}` : ''}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '1px 0 0' }}>Your place is secured — book any service below.</p>
          </div>
        </div>
      )}

      {/* ── Service grid — 2 columns, emergency full-width ── */}
      <div className="ce-sv-grid">
        {SERVICES.map(s => {
          const isEmergency = s.id === 'emergency_support_visit'
          if (isEmergency) {
            return (
              <div key={s.id} className="ce-sv-card ce-sv-wide">
                <span className="ce-sv-emoji">{s.emoji}</span>
                <div className="ce-sv-info">
                  <p className="ce-sv-name">{s.name}</p>
                  <p className="ce-sv-desc">{s.desc}</p>
                  <p className="ce-sv-price">{s.price}</p>
                </div>
                <button onClick={() => navigate('/dashboard/book/' + s.id)} className="ce-sv-book-btn ce-press">
                  Book now
                </button>
              </div>
            )
          }
          return (
            <div key={s.id} className="ce-sv-card">
              <span className="ce-sv-emoji">{s.emoji}</span>
              <p className="ce-sv-name">{s.name}</p>
              <p className="ce-sv-desc">{s.desc}</p>
              <p className="ce-sv-price">{s.price}</p>
              <button onClick={() => navigate('/dashboard/book/' + s.id)} className="ce-sv-book-btn ce-press">
                Book
              </button>
            </div>
          )
        })}
      </div>

      {!isFoundingMember && (
        <>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '8px 16px 12px' }}>Membership is a one-time join — services above are booked separately as needed.</p>
          <div style={{ margin: '0 16px 16px', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Founding Family</span>
                <span style={{ background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>FOUNDING FAMILY</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--sage)', margin: '0 0 14px' }}>₹100 <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>· one-time</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {['Health assistant — ask us anything, anytime', 'Priority emergency response for your family', 'Founding member benefits as we grow'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: 'var(--sage)', fontWeight: 700, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/founding-member/checkout" style={{ display: 'block', background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                Become a Founding Family →
              </Link>
            </div>
          </div>
        </>
      )}

      <section style={{ margin: '12px 16px 24px', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{isNri ? 'Switch to Monthly Plan' : 'Add Elder Care Plan'}</p>
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--sage)', margin: '6px 0 0' }}>₹1,500<span style={{ fontSize: 15, fontWeight: 500 }}>/month</span></p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>1 visit + weekly calls + WhatsApp reports + medicine reminders.</p>
        <Link to="/services" className="ce-btn ce-btn-white ce-btn-full" style={{ marginTop: 18, padding: 14 }}>{isNri ? 'Upgrade Now →' : 'Add Elder Care →'}</Link>
      </section>
    </div>
  )
}
