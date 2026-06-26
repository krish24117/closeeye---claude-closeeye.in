import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Phone } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  const shown = rows.filter(([, v]) => v && v.trim())
  if (!shown.length) return null
  return (
    <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-light)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{title}</span>
      </div>
      {shown.map(([label, value]) => (
        <div key={label} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-mid)', flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

interface Contact { name?: string; relation?: string; relationship?: string; phone?: string }
interface Med { name?: string; timing?: string; dose?: string }

// deno-lint-ignore no-explicit-any
function medLabel(m: any): string {
  if (typeof m === 'string') return m
  const mm = m as Med
  return [mm.name, mm.timing || mm.dose].filter(Boolean).join(' · ')
}

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'
  // deno-lint-ignore no-explicit-any
  const [elder, setElder] = useState<any>(null)
  const [society, setSociety] = useState<{ society_name?: string; flat_number?: string; area?: string; member_id?: string } | null>(null)

  useEffect(() => {
    if (!user) return
    if (isNri) {
      ;(async () => {
        const { data: lo } = await supabase.from('loved_ones').select('id, full_name, relationship').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        if (!lo?.id) return
        const { data: ep } = await supabase.from('elder_profiles').select('*').eq('loved_one_id', lo.id).maybeSingle()
        setElder({ ...ep, full_name: lo.full_name, relationship: lo.relationship })
      })()
    } else {
      supabase.from('society_members').select('society_name, flat_number, area, member_id').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setSociety(data))
    }
  }, [user, isNri])

  async function handleSignOut() { await signOut(); navigate('/') }

  const meds: string[] = Array.isArray(elder?.current_medications) ? elder.current_medications.map(medLabel).filter(Boolean) : []
  const contacts: Contact[] = Array.isArray(elder?.emergency_contacts) ? elder.emergency_contacts : []

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0E2A1F, #1B4332)', padding: '28px 20px', textAlign: 'center' }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
          {initials(isNri ? elder?.full_name || profile?.full_name : profile?.full_name)}
        </span>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '12px 0 0' }}>{isNri ? (elder?.full_name || profile?.full_name || 'Your loved one') : (profile?.full_name || 'Your account')}</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage)', margin: '2px 0 0' }}>
          {isNri ? [elder?.age ? `${elder.age} yrs` : '', elder?.address?.split(',').slice(-1)[0]?.trim()].filter(Boolean).join(' · ') || 'Cared for by Close Eye' : [society?.flat_number, society?.society_name].filter(Boolean).join(' · ') || 'Society Member'}
        </p>
        <span style={{ display: 'inline-block', marginTop: 10, background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>
          {isNri ? 'Companion Family' : `Founding Member${society?.member_id ? ` · ${society.member_id}` : ''}`}
        </span>
      </div>

      {isNri ? (
        <>
          <Section title="Health Information" rows={[
            ['Conditions', elder?.medical_conditions || ''],
            ['Medications', meds.join(', ')],
            ['Allergies', elder?.allergies || ''],
            ['Doctor', [elder?.doctor_name, elder?.doctor_phone].filter(Boolean).join(' · ')],
          ]} />
          <Section title="Preferences" rows={[
            ['Food', elder?.food_preferences || ''],
            ['Enjoys talking about', elder?.conversation_interests || ''],
            ['Things to avoid', elder?.things_to_avoid || ''],
            ['Daily routine', elder?.daily_routine || ''],
          ]} />
          {contacts.length > 0 && (
            <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-light)' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Emergency Contacts</span>
              </div>
              {contacts.map((c, i) => (
                <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', margin: 0 }}>{c.name || 'Contact'}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{c.relation || c.relationship || ''}</p>
                  </div>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--forest)', textDecoration: 'none' }}><Phone size={14} /> Call</a>}
                </div>
              ))}
            </div>
          )}
          <Section title="My Plan" rows={[['Account', 'Family'], ['Relationship', elder?.relationship || ''], ['Country', profile?.country || '']]} />
        </>
      ) : (
        <>
          <Section title="My Society" rows={[['Society', society?.society_name || ''], ['Flat', society?.flat_number || ''], ['Area', society?.area || '']]} />
          <Section title="My Membership" rows={[['Plan', 'Founding Member'], ['Fee', '₹100 — one-time'], ['Member ID', society?.member_id || '']]} />
          <Section title="Contact" rows={[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '']]} />
        </>
      )}

      <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '20px auto 0', background: 'none', border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-btn)', padding: '12px 24px', fontSize: 14, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}
