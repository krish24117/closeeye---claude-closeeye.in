import { useEffect, useState } from 'react'
import { TbUserPlus, TbBrandWhatsapp, TbBuildingCommunity, TbPlus, TbStethoscope } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
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
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [testSending, setTestSending] = useState(false)

  async function sendTestMessage() {
    const to = profile?.whatsapp_number?.trim()
    if (!to) {
      showToast('Your profile has no WhatsApp number — add one first', 'error')
      return
    }
    setTestSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-whatsapp', {
        body: {
          to,
          message: `✅ Close Eye WhatsApp test\n\nThis message confirms your Twilio sender is working.\n\nSent to: ${to}\nFrom: configured TWILIO_WHATSAPP_FROM\n\nClose Eye Admin`,
        },
      })
      if (error || !data?.sent) {
        showToast(`Send failed — check Supabase logs for the Twilio error`, 'error')
      } else {
        showToast(`Test sent to ${to} — check your WhatsApp`, 'success')
      }
    } catch (err) {
      showToast('Unexpected error — check console', 'error')
      console.error('Test WhatsApp error:', err)
    }
    setTestSending(false)
  }

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

  /* ---- doctors ---- */
  const [doctors, setDoctors] = useState<any[]>([])
  const [doctorAccounts, setDoctorAccounts] = useState<any[]>([])
  const [docLoading, setDocLoading] = useState(true)
  const [newDoc, setNewDoc] = useState({ name: '', specialisation: '', hospital: '', phone: '', whatsapp: '', user_id: '' })

  async function loadDoctors() {
    setDocLoading(true)
    const [{ data: docs }, { data: accts }] = await Promise.all([
      supabase.from('doctors').select('*').order('name'),
      supabase.from('profiles').select('id, full_name').eq('admin_role', 'doctor').order('full_name'),
    ])
    setDoctors(docs || [])
    setDoctorAccounts(accts || [])
    setDocLoading(false)
  }
  useEffect(() => { loadDoctors() }, [])

  const accountName = (uid?: string | null) =>
    doctorAccounts.find(a => a.id === uid)?.full_name || 'Linked account'

  async function toggleDoctorActive(d: any) {
    const { error } = await supabase.from('doctors').update({ is_active: !d.is_active }).eq('id', d.id)
    if (error) { showToast('Could not update doctor', 'error'); return }
    setDoctors(ds => ds.map(x => x.id === d.id ? { ...x, is_active: !x.is_active } : x))
    showToast(d.is_active ? 'Doctor deactivated' : 'Doctor activated', 'success')
  }

  async function removeDoctor(d: any) {
    if (!window.confirm(`Remove ${d.name} from the doctors roster?`)) return
    const { error } = await supabase.from('doctors').delete().eq('id', d.id)
    if (error) { showToast('Could not remove doctor', 'error'); return }
    setDoctors(ds => ds.filter(x => x.id !== d.id))
    showToast('Doctor removed', 'success')
  }

  async function linkDoctor(d: any, value: string) {
    const uid = value || null
    const { error } = await supabase.from('doctors').update({ user_id: uid }).eq('id', d.id)
    if (error) { showToast('Could not link doctor', 'error'); return }
    setDoctors(ds => ds.map(x => x.id === d.id ? { ...x, user_id: uid } : x))
    showToast('Doctor linked', 'success')
  }

  async function addDoctor() {
    const name = newDoc.name.trim()
    if (!name) { showToast('Doctor name is required', 'error'); return }
    const { data, error } = await supabase.from('doctors').insert({
      name,
      specialisation: newDoc.specialisation.trim() || null,
      hospital: newDoc.hospital.trim() || null,
      phone: newDoc.phone.trim() || null,
      whatsapp: newDoc.whatsapp.trim() || null,
      user_id: newDoc.user_id || null,
      is_active: true,
    }).select().single()
    if (error) { showToast(error.message || 'Could not add doctor', 'error'); return }
    setDoctors(ds => [data, ...ds])
    setNewDoc({ name: '', specialisation: '', hospital: '', phone: '', whatsapp: '', user_id: '' })
    showToast('Doctor added', 'success')
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

        {/* 1b) DOCTORS */}
        <Section
          title="Doctors"
          subtitle="The roster families' health queries can be assigned to."
          right={
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TbStethoscope size={20} color="var(--forest)" />
            </span>
          }
        >
          {docLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2].map(i => <Skeleton key={i} h={56} />)}</div>
          ) : (
            <>
              {doctors.length === 0 ? (
                <EmptyState title="No doctors yet" sub="Add a doctor below to build your roster." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {doctors.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--gray-light)', flexWrap: 'wrap' }}>
                      <Avatar name={d.name} size={34} />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--black)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {d.name}
                          <Badge tone={d.is_active ? 'green' : 'gray'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        {(d.specialisation || d.hospital) && (
                          <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>
                            {[d.specialisation, d.hospital].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {(d.phone || d.whatsapp) && (
                          <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 2 }}>
                            {[d.phone, d.whatsapp].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        <div style={{ marginTop: 4 }}>
                          {d.user_id ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest)' }}>Login linked · {accountName(d.user_id)}</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309' }}>No login yet</span>
                              <select
                                className="adm-input"
                                style={{ width: 200, height: 30, padding: '2px 8px', fontSize: 12 }}
                                value=""
                                onChange={e => linkDoctor(d, e.target.value)}
                              >
                                <option value="">Link to login account…</option>
                                {doctorAccounts.map(a => (
                                  <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <button className="adm-btn" onClick={() => toggleDoctorActive(d)}>
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDoctor(d)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--gray-mid)', textDecoration: 'underline' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add doctor form */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--gray-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', marginBottom: 10 }}>Add doctor</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <input className="adm-input" placeholder="Name *" value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} />
                  <input className="adm-input" placeholder="Specialisation" value={newDoc.specialisation} onChange={e => setNewDoc({ ...newDoc, specialisation: e.target.value })} />
                  <input className="adm-input" placeholder="Hospital" value={newDoc.hospital} onChange={e => setNewDoc({ ...newDoc, hospital: e.target.value })} />
                  <input className="adm-input" placeholder="Phone" value={newDoc.phone} onChange={e => setNewDoc({ ...newDoc, phone: e.target.value })} />
                  <input className="adm-input" placeholder="WhatsApp" value={newDoc.whatsapp} onChange={e => setNewDoc({ ...newDoc, whatsapp: e.target.value })} />
                  <select className="adm-input" value={newDoc.user_id} onChange={e => setNewDoc({ ...newDoc, user_id: e.target.value })}>
                    <option value="">Link to login account (optional)</option>
                    {doctorAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="adm-btn adm-btn-primary" onClick={addDoctor}>
                    <TbPlus size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />Add doctor
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '12px 0 0' }}>
                  To let a doctor log in at /doctor, set their account's role to Doctor in Team members above, then link it here.
                </p>
              </div>
            </>
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
            <button className="adm-btn" onClick={sendTestMessage} disabled={testSending}>
              {testSending ? 'Sending…' : 'Send test message'}
            </button>
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
