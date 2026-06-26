import { useAuth } from '@/lib/auth-context'

const WA = '919000221261'
const SERVICES = [
  ['🏠', 'Home Visit', '₹1,000', 'Companion visit + WhatsApp report'],
  ['👨‍⚕️', 'Doctor Visit Support', '₹1,500', 'Accompanies them to the doctor + notes'],
  ['🏥', 'Hospital Half Day', '₹2,000', 'Up to 4 hours hospital support'],
  ['🏥', 'Hospital Full Day', '₹4,000', 'Full day. Updated every 2 hours'],
  ['🚨', 'Emergency Visit', '₹3,000', 'Response within 2 hours'],
  ['🛒', 'Grocery & Medicine', '₹500', 'Collection and delivery'],
  ['🔧', 'Home Maintenance', '₹500', 'Coordinate repairs'],
]

export function DashboardBook() {
  const { profile } = useAuth()
  const isNri = profile?.user_type === 'nri'

  function book(name: string, price: string) {
    const msg = `Hi, I'd like to book: ${name} (${price}). Name: ${profile?.full_name || ''}.`
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 4px' }}>Book a Service</h1>
      <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 16px 16px' }}>
        {isNri ? 'For your loved one · Hyderabad' : 'For your family · Hyderabad'}
      </p>

      {SERVICES.map(([emoji, name, price, desc]) => (
        <div key={name} style={{ margin: '0 16px 10px', background: '#fff', borderRadius: 'var(--radius-card)', padding: '18px 20px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{name}</p>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '2px 0 0' }}>{desc}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)', margin: '0 0 6px' }}>{price}</p>
            <button onClick={() => book(name, price)} className="ce-press" style={{ background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-btn)' }}>Book</button>
          </div>
        </div>
      ))}

      {/* Plan card */}
      <section style={{ margin: '12px 16px 24px', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{isNri ? 'Switch to Monthly Plan' : 'Add Elder Care Plan'}</p>
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--sage)', margin: '6px 0 0' }}>₹1,500<span style={{ fontSize: 15, fontWeight: 500 }}>/month</span></p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>1 visit + weekly calls + WhatsApp reports + medicine reminders.</p>
        <a href="/services" className="ce-btn ce-btn-white ce-btn-full" style={{ marginTop: 18, padding: 14 }}>{isNri ? 'Upgrade Now →' : 'Add Elder Care →'}</a>
      </section>
    </div>
  )
}
