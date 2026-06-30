import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, EmptyState, ErrorBox, Skeleton,
  timeAgo, istDate, useAdmin,
} from './_shared'

type Filter = 'all' | 'unassigned' | 'assigned' | 'reviewed' | 'verified'
type Urgency = 'urgent' | 'watch' | 'routine'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'reviewed', label: 'Under review' },
  { key: 'verified', label: 'Verified' },
]

function isVerified(q: any) {
  return q.verification_status === 'verified' || q.doctor_verified
}

function formatMs(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type SlaInfo = { state: 'on-track' | 'due-soon' | 'overdue'; label: string; pct: number }

function slaInfo(q: any): SlaInfo | null {
  if (!q.sla_deadline || isVerified(q)) return null
  const now = Date.now()
  const deadline = new Date(q.sla_deadline).getTime()
  const created = new Date(q.created_at).getTime()
  const total = deadline - created
  const elapsed = now - created
  const pct = total > 0 ? elapsed / total : 1

  if (deadline <= now) {
    return { state: 'overdue', label: `Overdue ${formatMs(now - deadline)}`, pct: Math.min(pct, 2) }
  }
  if (pct >= 0.75) {
    return { state: 'due-soon', label: `${formatMs(deadline - now)} left`, pct }
  }
  return { state: 'on-track', label: `${formatMs(deadline - now)} left`, pct }
}

function SlaChip({ info }: { info: SlaInfo | null }) {
  if (!info) return null
  const colors: Record<string, { bg: string; color: string }> = {
    overdue: { bg: '#FEE2E2', color: '#B91C1C' },
    'due-soon': { bg: '#FEF3C7', color: '#B45309' },
    'on-track': { bg: '#DCFCE7', color: '#15803D' },
  }
  const c = colors[info.state]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {info.label}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: Urgency | undefined }) {
  if (!urgency || urgency === 'routine') return null
  return urgency === 'urgent'
    ? <Badge tone="red">Urgent</Badge>
    : <Badge tone="amber">Watch</Badge>
}

function slaOrder(q: any, now: number): number {
  if (isVerified(q)) return 10
  if (!q.sla_deadline) return 5
  const deadline = new Date(q.sla_deadline).getTime()
  const created = new Date(q.created_at).getTime()
  const total = deadline - created
  const elapsed = now - created
  const pct = total > 0 ? elapsed / total : 1
  if (pct >= 1) return 0
  if (pct >= 0.75) return 1
  return 2
}

function urgencyOrder(q: any): number {
  switch (q.urgency) {
    case 'urgent': return 0
    case 'watch': return 1
    default: return 2
  }
}

export function AdminQueries() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const { adminRole } = useAdmin()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [authors, setAuthors] = useState<Record<string, any>>({})
  const [doctorsById, setDoctorsById] = useState<Record<string, any>>({})
  const [doctorsByUserId, setDoctorsByUserId] = useState<Record<string, any>>({})
  const [doctorList, setDoctorList] = useState<any[]>([])

  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [pickDoctor, setPickDoctor] = useState('')
  const [note, setNote] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [escalating, setEscalating] = useState(false)

  // tick every 60s to refresh SLA countdowns
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const { data, error: err } = await supabase
        .from('member_queries')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) { setError(true); setLoading(false); return }

      const list = data || []
      const ids = [...new Set(list.map((q: any) => q.user_id).filter(Boolean))]
      let authorMap: Record<string, any> = {}
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, whatsapp_number')
          .in('id', ids)
        authorMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
      }

      const { data: docs } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('name')
      const docList = docs || []
      const byId: Record<string, any> = {}
      const byUser: Record<string, any> = {}
      docList.forEach((d: any) => { byId[d.id] = d; if (d.user_id) byUser[d.user_id] = d })

      setRows(list)
      setAuthors(authorMap)
      setDoctorList(docList)
      setDoctorsById(byId)
      setDoctorsByUserId(byUser)
    } catch {
      setError(true)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const selected = useMemo(() => rows.find(r => r.id === selectedId) || null, [rows, selectedId])

  useEffect(() => { setPickDoctor(''); setNote(''); setReassigning(false) }, [selectedId])

  const awaitingCount = useMemo(
    () => rows.filter(q => q.verification_status !== 'verified' && q.status !== 'doctor_reviewed').length,
    [rows],
  )

  const urgentCount = useMemo(
    () => rows.filter(q => q.urgency === 'urgent' && !isVerified(q)).length,
    [rows],
  )

  const filtered = useMemo(() => {
    return rows.filter(q => {
      switch (filter) {
        case 'unassigned': return q.verification_status === 'pending'
        case 'assigned': return q.verification_status === 'assigned'
        case 'reviewed': return q.verification_status === 'reviewed'
        case 'verified': return isVerified(q)
        default: return true
      }
    })
  }, [rows, filter])

  const sorted = useMemo(() => {
    const now = Date.now()
    return [...filtered].sort((a, b) => {
      const sa = slaOrder(a, now); const sb = slaOrder(b, now)
      if (sa !== sb) return sa - sb
      const ua = urgencyOrder(a); const ub = urgencyOrder(b)
      if (ua !== ub) return ua - ub
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, tick])

  function patchRow(id: string, patch: any) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  function assignedDoctor(q: any) {
    if (!q?.assigned_doctor_id) return null
    return doctorsByUserId[q.assigned_doctor_id] || null
  }

  function familyNameOf(q: any) {
    return authors[q.user_id]?.full_name || 'A family'
  }

  /* ---------- run escalation (manual trigger) ---------- */
  async function runEscalation(simulate?: string) {
    setEscalating(true)
    try {
      const body: any = simulate ? { simulate } : {}
      const { data, error: err } = await supabase.functions.invoke('sla-escalation', { body })
      if (err) { showToast('Escalation failed: ' + err.message, 'error'); return }
      const d = data as any
      const actCount = d.actions?.length || 0
      if (simulate) {
        const adminSent = d.actions?.find((a: any) => a.action === 'simulate_admin_alert')?.sent
        const famSent = d.actions?.find((a: any) => a.action === 'simulate_interim_msg')?.sent
        showToast(
          `Simulation: admin alert ${adminSent ? 'sent' : 'not sent (no WhatsApp configured)'} · family interim msg ${famSent ? 'sent' : 'not sent'}`,
          actCount > 0 ? 'success' : 'info',
        )
      } else {
        showToast(
          actCount > 0 ? `Escalation: ${actCount} action(s) taken` : 'Escalation checked — no actions needed',
          actCount > 0 ? 'success' : 'info',
        )
      }
      load() // refresh to show updated timestamps
    } catch (e: any) {
      showToast('Escalation error: ' + e.message, 'error')
    } finally {
      setEscalating(false)
    }
  }

  /* ---------- mutations ---------- */
  async function assign(q: any) {
    const d = doctorsById[pickDoctor]
    if (!d || saving) return
    setSaving(true)
    const assigned_at = new Date().toISOString()
    const { error: err } = await supabase
      .from('member_queries')
      .update({ assigned_doctor_id: d.user_id || null, assigned_at, verification_status: 'assigned' })
      .eq('id', q.id)
    if (err) { setSaving(false); showToast(err.message || 'Could not assign', 'error'); return }

    let notified = false
    if (d.whatsapp) {
      try {
        await supabase.functions.invoke('admin-send-whatsapp', {
          body: {
            to: d.whatsapp,
            message: `🏥 Close Eye — New query assigned\n\nDr. ${d.name}, a health query has been assigned to you for review.\n\nFamily: ${familyNameOf(q)}\nFor: ${q.subject_label || '—'}\nQuery: ${(q.question || '').slice(0, 100)}\n\nReview at: closeeye.in/doctor\n\nClose Eye Team 🌿`,
          },
        })
        notified = true
      } catch { /* best-effort */ }
    }

    patchRow(q.id, { assigned_doctor_id: d.user_id || null, assigned_at, verification_status: 'assigned' })
    setSaving(false); setReassigning(false); setPickDoctor(''); setNote('')
    if (!d.user_id) {
      showToast(`Assigned — note: Dr. ${d.name} has no linked login account yet`, 'info')
    } else {
      showToast('Assigned' + (notified ? ' and doctor notified' : ''), 'success')
    }
  }

  async function publish(q: any) {
    if (publishing) return
    const doc = assignedDoctor(q)
    const doctorName = doc?.name || 'the doctor'
    const specialisation = doc?.specialisation || ''
    const hospital = doc?.hospital || ''

    setPublishing(true)
    const now = new Date().toISOString()
    const { error: err } = await supabase
      .from('member_queries')
      .update({
        doctor_verified: true, verified_at: now, verification_status: 'verified',
        status: 'doctor_reviewed', answer: q.doctor_response,
        reviewed_by: `Dr. ${doctorName}`, answered_at: now,
      })
      .eq('id', q.id)
    if (err) { setPublishing(false); showToast(err.message || 'Could not publish', 'error'); return }

    const fam = authors[q.user_id]
    if (fam?.whatsapp_number) {
      try {
        await supabase.functions.invoke('admin-send-whatsapp', {
          body: {
            to: fam.whatsapp_number,
            message: `✅ Close Eye Health Update\n\nYour health query has been reviewed by Dr. ${doctorName}${specialisation ? `, ${specialisation}` : ''}${hospital ? ` at ${hospital}` : ''}.\n\nTheir response is now available in your Close Eye dashboard.\n\ncloseeye.in/dashboard/ask 🌿`,
          },
        })
      } catch { /* best-effort */ }
    }

    patchRow(q.id, {
      doctor_verified: true, verified_at: now, verification_status: 'verified',
      status: 'doctor_reviewed', answer: q.doctor_response,
      reviewed_by: `Dr. ${doctorName}`, answered_at: now,
    })
    setPublishing(false)
    showToast('Published — family notified', 'success')
  }

  async function remove(q: any) {
    if (!window.confirm('Delete this query permanently? This cannot be undone.')) return
    const { error: err } = await supabase.from('member_queries').delete().eq('id', q.id)
    if (err) { showToast(err.message || 'Could not delete', 'error'); return }
    setRows(rs => rs.filter(r => r.id !== q.id))
    setSelectedId(null)
    showToast('Deleted', 'info')
  }

  /* ---------- card helpers ---------- */
  function cardBadge(q: any) {
    if (isVerified(q)) return <Badge tone="green">Verified</Badge>
    if (q.verification_status === 'reviewed') return <Badge tone="blue">Under review</Badge>
    if (q.verification_status === 'assigned') {
      const d = assignedDoctor(q)
      return <Badge tone="amber">Assigned to Dr. {d?.name || 'a doctor'}</Badge>
    }
    return <Badge tone="gray">Unassigned</Badge>
  }

  function cardBorder(q: any) {
    const info = slaInfo(q)
    if (info?.state === 'overdue') return '#EF4444'
    if (info?.state === 'due-soon') return '#F59E0B'
    if (isVerified(q)) return 'var(--forest)'
    if (q.verification_status === 'reviewed') return '#2563EB'
    if (q.verification_status === 'assigned') return '#F59E0B'
    return 'var(--gray-mid)'
  }

  return (
    <>
      <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="adm-page-h">Health Queries</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>
            {awaitingCount} awaiting review
            {urgentCount > 0 && <span style={{ color: '#B91C1C', fontWeight: 600 }}> · {urgentCount} urgent</span>}
          </p>
        </div>
        {adminRole === 'super_admin' && (
          <button
            className="adm-btn"
            style={{ fontSize: 12 }}
            disabled={escalating}
            onClick={() => runEscalation()}
          >
            {escalating ? 'Running…' : 'Run SLA escalation'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`adm-pill-f${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} h={120} />)}
        </div>
      ) : error ? (
        <ErrorBox onRetry={load} />
      ) : sorted.length === 0 ? (
        <Card><EmptyState title="No queries here" sub="Nothing matches this filter right now." /></Card>
      ) : (
        sorted.map(q => {
          const info = slaInfo(q)
          return (
            <div
              key={q.id}
              className="adm-card adm-card-pad"
              onClick={() => setSelectedId(q.id)}
              style={{ borderLeft: `3px solid ${cardBorder(q)}`, marginBottom: 10, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>
                    {familyNameOf(q)}{q.subject_label ? ` — for ${q.subject_label}` : ''}
                  </span>
                  <UrgencyBadge urgency={q.urgency} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <SlaChip info={info} />
                  <span style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{timeAgo(q.created_at)}</span>
                  {cardBadge(q)}
                </div>
              </div>
              <p style={{
                fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0 0',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {q.question}
              </p>
            </div>
          )
        })
      )}

      {selected && (
        <QueryPanel
          q={selected}
          familyName={familyNameOf(selected)}
          assignedDoc={assignedDoctor(selected)}
          doctorList={doctorList}
          pickDoctor={pickDoctor}
          setPickDoctor={setPickDoctor}
          note={note}
          setNote={setNote}
          reassigning={reassigning}
          setReassigning={setReassigning}
          saving={saving}
          publishing={publishing}
          escalating={escalating}
          onAssign={() => assign(selected)}
          onPublish={() => publish(selected)}
          onDelete={() => remove(selected)}
          onSimulate={() => runEscalation(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}

/* ---------- slide-over panel ---------- */
function QueryPanel({
  q, familyName, assignedDoc, doctorList,
  pickDoctor, setPickDoctor, note, setNote,
  reassigning, setReassigning, saving, publishing, escalating,
  onAssign, onPublish, onDelete, onSimulate, onClose,
}: any) {
  const verified = isVerified(q)
  const info = slaInfo(q)
  const label11 = { fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', textTransform: 'uppercase' as const, letterSpacing: 0.4 }
  const label13 = { fontSize: 13, fontWeight: 600, color: 'var(--black)' }

  const showSelector = !assignedDoc || q.verification_status === 'pending' || reassigning
  const doctorName = assignedDoc?.name || 'the doctor'

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover" style={{ width: 520, overflow: 'auto' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4, fontSize: 22, lineHeight: 1 }}
        >
          x
        </button>

        {/* SLA banner */}
        {info && !verified && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: info.state === 'overdue' ? '#FEE2E2' : info.state === 'due-soon' ? '#FEF3C7' : '#DCFCE7',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: info.state === 'overdue' ? '#991B1B' : info.state === 'due-soon' ? '#92400E' : '#166534',
              }}>
                {info.state === 'overdue' ? 'SLA BREACHED' : info.state === 'due-soon' ? 'DUE SOON' : 'ON TRACK'}
              </div>
              <div style={{ fontSize: 12, color: info.state === 'overdue' ? '#B91C1C' : info.state === 'due-soon' ? '#B45309' : '#15803D' }}>
                {info.label}
                {q.urgency && q.urgency !== 'routine' && <> · {q.urgency === 'urgent' ? 'Urgent 2h SLA' : 'Watch 12h SLA'}</>}
              </div>
            </div>
            {info.state !== 'on-track' && (
              <button
                className="adm-btn"
                style={{ fontSize: 11, padding: '5px 10px' }}
                disabled={escalating}
                onClick={onSimulate}
              >
                {escalating ? 'Running…' : 'Simulate breach'}
              </button>
            )}
          </div>
        )}

        {/* SECTION 1 — query info */}
        <div style={{ paddingRight: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)' }}>Health query</div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.8 }}>
            <div><strong>Who asked:</strong> {familyName}</div>
            <div><strong>For:</strong> {q.subject_label || '—'}</div>
            <div><strong>Asked:</strong> {timeAgo(q.created_at)}</div>
            {q.urgency && <div><strong>Urgency:</strong> {q.urgency.charAt(0).toUpperCase() + q.urgency.slice(1)}</div>}
            {q.admin_alerted_at && <div style={{ color: '#B91C1C' }}><strong>Admin alerted:</strong> {timeAgo(q.admin_alerted_at)}</div>}
            {q.interim_msg_sent_at && <div style={{ color: '#B45309' }}><strong>Family interim msg sent:</strong> {timeAgo(q.interim_msg_sent_at)}</div>}
          </div>
        </div>

        <div style={{
          marginTop: 14, background: 'var(--cream)', borderRadius: 12, padding: 16,
          fontSize: 15, color: 'var(--gray-dark)', lineHeight: 1.7,
        }}>
          {q.question || '—'}
        </div>

        {/* SECTION 2 — AI response */}
        {q.ai_answer && (
          <div style={{ marginTop: 20 }}>
            <div style={label11}>AI RESPONSE</div>
            <div style={{
              marginTop: 8, background: '#F0FDF4', borderLeft: '3px solid var(--sage)',
              borderRadius: '0 8px 8px 0', padding: '14px 16px',
              fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.7,
            }}>
              {q.ai_answer}
            </div>
          </div>
        )}

        {/* SECTION 3 — assign to doctor */}
        {!verified && (
          <div style={{ marginTop: 22 }}>
            <div style={label13}>Assign to doctor</div>

            {assignedDoc && q.verification_status !== 'pending' && !reassigning && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--gray-dark)' }}>
                  Currently assigned to <strong>Dr. {assignedDoc.name}</strong>
                  {assignedDoc.specialisation ? ` — ${assignedDoc.specialisation}` : ''}
                  {assignedDoc.hospital ? ` · ${assignedDoc.hospital}` : ''}
                </div>
                <span
                  className="adm-link"
                  onClick={() => setReassigning(true)}
                  style={{ display: 'inline-block', marginTop: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  Reassign to a different doctor
                </span>
              </div>
            )}

            {showSelector && (
              <>
                <select
                  className="adm-input"
                  value={pickDoctor}
                  onChange={e => setPickDoctor(e.target.value)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <option value="">Select a doctor…</option>
                  {doctorList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} — {d.specialisation || 'General'} · {d.hospital || '—'}
                    </option>
                  ))}
                </select>
                <textarea
                  className="adm-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add context for the doctor…"
                  rows={3}
                  style={{ width: '100%', marginTop: 10 }}
                />
                <button
                  className="adm-btn adm-btn-primary"
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={saving || !pickDoctor}
                  onClick={onAssign}
                >
                  {saving ? 'Assigning…' : 'Assign and notify doctor'}
                </button>
              </>
            )}
          </div>
        )}

        {/* SECTION 4 — doctor's response */}
        {q.doctor_response && (
          <div style={{ marginTop: 22 }}>
            <div style={label13}>Doctor's response</div>
            <div style={{
              marginTop: 8, background: '#F0FDF4', borderLeft: '3px solid #16a34a',
              borderRadius: '0 8px 8px 0', padding: '14px 16px',
              fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.7,
            }}>
              {q.doctor_response}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 6 }}>
              Dr. {doctorName} · {istDate(q.verified_at || q.assigned_at)}
            </div>
            {!q.doctor_verified && (
              <button
                className="adm-btn adm-btn-primary"
                style={{ padding: '8px 16px', marginTop: 12 }}
                disabled={publishing}
                onClick={onPublish}
              >
                {publishing ? 'Publishing…' : 'Mark as published'}
              </button>
            )}
          </div>
        )}

        {/* BOTTOM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--gray-light)' }}>
          <button className="adm-btn" onClick={onClose}>Close</button>
          <span
            className="adm-link"
            onClick={onDelete}
            style={{ fontSize: 13, cursor: 'pointer', color: '#B91C1C' }}
          >
            Delete query
          </span>
        </div>
      </div>
    </>
  )
}
