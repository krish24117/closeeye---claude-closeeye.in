import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-light)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{title}</span>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', textAlign: 'right' }}>{value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'
  const [extra, setExtra] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('name, relationship').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        .then(({ data }) => { if (data) setExtra({ elder: data.name, relation: data.relationship || '' }) })
    } else {
      supabase.from('society_members').select('society_name, flat_number, area, member_id').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setExtra({ society: data.society_name || '', flat: data.flat_number || '', area: data.area || '', memberId: data.member_id || '' }) })
    }
  }, [user, isNri])

  async function handleSignOut() { await signOut(); navigate('/') }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0E2A1F, #1B4332)', padding: '28px 20px', textAlign: 'center' }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
          {initials(profile?.full_name)}
        </span>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '12px 0 0' }}>{profile?.full_name || 'Your account'}</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage)', margin: '2px 0 0' }}>
          {isNri ? 'NRI Family' : `${extra.society || 'Society Member'}${extra.flat ? ` · ${extra.flat}` : ''}`}
        </p>
        <span style={{ display: 'inline-block', marginTop: 10, background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>
          {isNri ? 'Companion Family' : `Founding Member${extra.memberId ? ` · ${extra.memberId}` : ''}`}
        </span>
      </div>

      {isNri ? (
        <>
          <Section title="Loved one" rows={[['Name', extra.elder || ''], ['Relationship', extra.relation || '']]} />
          <Section title="Contact" rows={[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '']]} />
          <Section title="My Plan" rows={[['Account', 'Family'], ['Country', profile?.country || '']]} />
        </>
      ) : (
        <>
          <Section title="My Society" rows={[['Society', extra.society || ''], ['Flat', extra.flat || ''], ['Area', extra.area || '']]} />
          <Section title="My Membership" rows={[['Plan', 'Founding Member'], ['Fee', '₹100 — one-time'], ['Member ID', extra.memberId || '']]} />
          <Section title="Contact" rows={[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '']]} />
        </>
      )}

      <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '20px auto 0', background: 'none', border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-btn)', padding: '12px 24px', fontSize: 14, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}
