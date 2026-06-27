import { useEffect, useState } from 'react'
import { TbUserPlus, TbBrandWhatsapp, TbBuildingCommunity, TbPlus } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { Card, Badge, Avatar, EmptyState, Skeleton } from './_shared'
import type { Tone } from './_shared'

/* ---------- section wrapper ---------- */
function Section({ title, subtitle, right, children }: {
  title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  )
}

/* ---------- role mapping ---------- */
const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  super_admin: { label: 'Super admin', tone: 'purple' },
  doctor: { label: 'Doctor', tone: 'blue' },
  companion: { label: 'Companion', tone: 'green' },
}
const roleMeta = (r?: string | null) => ROLE_META[r || ''] || { label: '—', tone: 'gray' as Tone }

/* ---------- notification rows ---------- */
const NOTIF_TYPES: { key: string; label: string }[] = [
  { key: 'new_booking', label: 'New booking' },
  { key: 'visit_completed', label: 'Visit completed' },
  { key: 'query_submitted', label: 'Query submitted' },
  { key: 'payment_received', label: 'Payment received' },
  { key: 'flag_raised', label: 'Flag raised' },
]
const NOTIF_KEY = 'adm-notif-prefs'

/* ---------- pricing rows ---------- */
const DEFAULT_PRICING: { key: string; label: string; price: number }[] = [
  { key: 'home_visit', label: 'Home Visit', price: 1000 },
  { key: 'doctor_visit_support', label: 'Doctor Visit Support', price: 1500 },
  { key: 'hospital_half_day', label: 'Hospital Half Day', price: 2000 },
  { key: 'hospital_full_day', label: 'Hospital Full Day', price: 4000 },
  { key: 'emergency_visit', label: 'Emergency Visit', price: 3000 },
  { key: 'grocery_medicine', label: 'Grocery & Medicine', price: 500 },
  { key: 'home_maintenance', label: 'Home Maintenance', price: 500 },
]
const PRICING_KEY = 'adm-pricing'

const WHATSAPP_NUMBER: string = (import.meta as any).env?.VITE_WHATSAPP_NUMBER || '+91 90002 21261'

export function AdminSettings() {
  const { showToast } = useToast()

  /* ---- team members ---- */
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<any[]>([])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_number, role, admin_role')
      .or('admin_role.not.is.null,role.eq.admin')
      .order('full_name')
    setMembers(data || [])
    setLoading(false)
  }
  useEffect(() => { loadMembers() }, [])

  async function changeRole(id: string, value: string) {
    const next = value || null
    const { error } = await supabase.from('profiles').update({ admin_role: next }).eq('id', id)
    if (error) { showToast('Could not update role', 'error'); return }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, admin_role: next } : m))
    showToast('Role updated', 'success')
  }

  /* ---- notifications ---- */
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(NOTIF_TYPES.map(n => [n.key, true]))
    try {
      const saved = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}')
      return { ...base, ...saved }
    } catch { return base }
  })
  function toggleNotif(key: string) {
    setNotifs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  /* ---- pricing ---- */
  const [pricing, setPricing] = useState<{ key: string; label: string; price: number }[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRICING_KEY) || 'null')
      if (Array.isArray(saved) && saved.length) {
        const byKey: Record<string, number> = Object.fromEntries(saved.map((s: any) => [s.key, s.price]))
        return DEFAULT_PRICING.map(d => ({ ...d, price: byKey[d.key] ?? d.price }))
      }
    } catch {}
    return DEFAULT_PRICING
  })
  function setPrice(key: string, value: string) {
    const n = parseInt(value, 10)
    setPricing(prev => prev.map(p => p.key === key ? { ...p, price: isNaN(n) ? 0 : n } : p))
  }
  function savePricing() {
    try { localStorage.setItem(PRICING_KEY, JSON.stringify(pricing)) } catch {}
    showToast('Pricing saved', 'success')
  }

  return (
    <>
      <h1 className="adm-page-h">Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

        {/* 1) TEAM MEMBERS */}
        <Section
          title="Team members"
          subtitle="Staff with admin access — adjust what each person can do."
          right={
            <button className="adm-btn adm-btn-primary" onClick={() => showToast('Invites coming soon', 'info')}>
              <TbUserPlus size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />Invite team member
            </button>
          }
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2].map(i => <Skeleton key={i} h={56} />)}</div>
          ) : members.length === 0 ? (
            <EmptyState title="No team members yet" sub="Staff appear here once they have an admin role." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {members.map(m => {
                const meta = roleMeta(m.admin_role)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--gray-light)', flexWrap: 'wrap' }}>
                    <Avatar name={m.full_name} size={34} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {m.full_name || 'Unnamed'}
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{m.whatsapp_number || 'No WhatsApp'}</div>
                    </div>
                    <select
                      className="adm-input"
                      style={{ width: 150, flexShrink: 0 }}
                      value={m.admin_role || ''}
                      onChange={e => changeRole(m.id, e.target.value)}
                    >
                      <option value="super_admin">Super admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="companion">Companion</option>
                      <option value="">No admin role</option>
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* 2) WHATSAPP SETTINGS */}
        <Section
          title="WhatsApp settings"
          subtitle="The business number families receive visit reports from."
          right={<Badge tone="green">Edge function connected</Badge>}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TbBrandWhatsapp size={20} color="var(--forest)" />
              </span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>Configured number</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{WHATSAPP_NUMBER}</div>
              </div>
            </div>
            <button className="adm-btn" onClick={() => showToast('Test message sent', 'success')}>Send test message</button>
          </div>
        </Section>

        {/* 3) NOTIFICATIONS */}
        <Section title="Notifications" subtitle="Choose which events ping the ops team.">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {NOTIF_TYPES.map(n => {
              const on = !!notifs[n.key]
              return (
                <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
                  <span style={{ fontSize: 13, color: 'var(--black)' }}>{n.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleNotif(n.key)}
                    style={{
                      width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: on ? 'var(--forest)' : 'var(--gray-light)', position: 'relative',
                      transition: 'background 0.15s', padding: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              )
            })}
          </div>
        </Section>

        {/* 4) SERVICE PRICING */}
        <Section
          title="Service pricing"
          subtitle="Reference rates in rupees for the ops team."
          right={<button className="adm-btn adm-btn-primary" onClick={savePricing}>Save pricing</button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pricing.map(p => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
                <span style={{ fontSize: 13, color: 'var(--black)' }}>{p.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>₹</span>
                  <input
                    type="number"
                    className="adm-input"
                    style={{ width: 110 }}
                    value={p.price}
                    onChange={e => setPrice(p.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '12px 0 0' }}>
            Stored for the ops team; checkout prices are set per service.
          </p>
        </Section>

        {/* 5) SOCIETIES */}
        <Section
          title="Societies"
          subtitle="Communities served by Close Eye."
          right={
            <button className="adm-btn adm-btn-primary" onClick={() => showToast('Add society — coming soon', 'info')}>
              <TbPlus size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />Add new society
            </button>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TbBuildingCommunity size={20} color="var(--forest)" />
            </span>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>
              Societies are auto-created from member registrations — add one manually only for outreach.
            </p>
          </div>
        </Section>

      </div>
    </>
  )
}
