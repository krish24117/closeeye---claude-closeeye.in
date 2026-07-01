import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock, ArrowRight, FileText, CalendarOff, Pin, History, Pill,
} from 'lucide-react'
import { format, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  greetingFor, firstNameOf, Avatar, asArray, continuityEntries, usePullToRefresh,
  type Medication,
} from './_shared'

type Booking = {
  id: string
  status: string
  scheduled_at: string | null
  loved_one_id: string | null
  loved_ones: { full_name: string | null; city: string | null; address: string | null } | null
  visits: { id: string; flags: string | null }[] | null
}
type Elder = {
  loved_one_id: string | null
  pinned_note: string | null
  continuity_notes: string | null
  current_medications: unknown
}

// ── Pre-visit briefing note (priority: pinned → continuity → medicines → default)
function briefingNote(elder: Elder | undefined): { text: string; kind: 'pinned' | 'continuity' | 'plain' } {
  if (elder?.pinned_note) return { text: elder.pinned_note, kind: 'pinned' }
  const cont = continuityEntries(elder?.continuity_notes, 1)[0]
  if (cont) return { text: cont, kind: 'continuity' }
  const meds = asArray<Medication>(elder?.current_medications).map(m => m.name).filter(Boolean)
  if (meds.length) return { text: `Remember to check medicines: ${meds.slice(0, 3).join(', ')}.`, kind: 'plain' }
  return { text: 'No special notes — be warm, attentive, and take your time.', kind: 'plain' }
}

const STATUS_META: Record<string, { label: string; cls: string; accent: string }> = {
  companion_assigned: { label: 'Upcoming',     cls: 'bg-[#0E2A1F]/[0.06] text-[#0E2A1F]', accent: 'bg-[#0E2A1F]' },
  in_progress:        { label: 'In progress',  cls: 'bg-[#A8D5B5]/20 text-[#0F5132]',      accent: 'bg-[#A8D5B5]' },
  completed:          { label: 'Done ✓',        cls: 'bg-[#DCFCE7] text-[#15803D]',         accent: 'bg-[#E5E5EA]' },
  flagged:            { label: 'Flagged !',     cls: 'bg-[#FEE2E2] text-[#B91C1C]',         accent: 'bg-[#EF4444]' },
}

function VisitCard({ b, elder }: { b: Booking; elder: Elder | undefined }) {
  const flagged = b.status === 'completed' && (b.visits || []).some(v => v.flags === 'monitor' || v.flags === 'urgent')
  const metaKey = flagged ? 'flagged' : b.status
  const meta = STATUS_META[metaKey] || STATUS_META.companion_assigned
  const lo = b.loved_ones
  const subRow = [lo?.city, lo?.address].filter(Boolean).join(' · ')
  const isUpcoming = b.status === 'companion_assigned'
  const note = isUpcoming ? briefingNote(elder) : null

  return (
    <div className="bg-white rounded-2xl mx-4 mb-2.5 border-[0.5px] border-[#E5E5EA] shadow-[var(--shadow-card)] overflow-hidden ce-press">
      <div className={`h-[3px] w-full ${meta.accent}`} />
      <div className="p-4">
        {/* Row 1 — time + status */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#0E2A1F]">
            {b.scheduled_at ? format(new Date(b.scheduled_at), 'h:mm a') : 'Anytime today'}
          </p>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
        </div>

        {/* Row 2 — elder */}
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={lo?.full_name} size={40} />
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#1D1D1F] truncate">{lo?.full_name || 'Elder'}</p>
            {subRow && <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">{subRow}</p>}
          </div>
        </div>

        {/* Pre-visit note (upcoming only) */}
        {note && (
          <>
            <div className="h-px bg-[#E5E5EA] my-3" />
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-1.5 flex items-center gap-1.5">
              {note.kind === 'pinned' ? <Pin size={12} className="text-[#F59E0B]" />
                : note.kind === 'continuity' ? <History size={12} className="text-[#16a34a]" />
                : <Pill size={12} className="text-[#0E2A1F]" />}
              Pre-visit note
            </p>
            <p
              className={`text-[13px] text-[#3A3A3C] leading-[1.55] line-clamp-2 ${
                note.kind === 'pinned'     ? 'bg-[#FFFBEB] border-l-[3px] border-[#F59E0B] rounded-r-lg px-3 py-2 italic'
                : note.kind === 'continuity' ? 'bg-[#F0FDF4] border-l-[3px] border-[#A8D5B5] rounded-r-lg px-3 py-2 italic'
                : 'italic'
              }`}
            >
              {note.text}
            </p>
          </>
        )}

        {/* Action */}
        <ActionButton b={b} />
      </div>
    </div>
  )
}

function ActionButton({ b }: { b: Booking }) {
  if (b.status === 'in_progress') {
    return (
      <Link to={`/companion/visit/${b.id}`}
        className="mt-3 flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl bg-[#A8D5B5] text-[#0E2A1F] text-[14px] font-semibold">
        Continue visit <ArrowRight size={17} />
      </Link>
    )
  }
  if (b.status === 'completed') {
    return (
      <Link to="/companion/visits"
        className="mt-3 flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl border-[0.5px] border-[#E5E5EA] text-[#6E6E73] text-[14px] font-semibold">
        <FileText size={16} /> View report
      </Link>
    )
  }
  return (
    <Link to={`/companion/visit/${b.id}`}
      className="mt-3 flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl bg-[#0E2A1F] text-white text-[14px] font-semibold">
      Start visit <ArrowRight size={17} />
    </Link>
  )
}

export function CompanionHome() {
  const { user, profile } = useAuth()
  const [today, setToday] = useState<Booking[]>([])
  const [monthDone, setMonthDone] = useState<{ loved_one_id: string | null; checked_in_at: string | null; checked_out_at: string | null }[]>([])
  const [elders, setElders] = useState<Record<string, Elder>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const mStart = startOfMonth(new Date()), mEnd = endOfMonth(new Date())

      const [todayRes, monthRes] = await Promise.all([
        supabase.from('bookings')
          .select('id,status,scheduled_at,loved_one_id,loved_ones(full_name,city,address),visits(id,flags)')
          .eq('companion_id', user.id)
          .neq('status', 'cancelled')
          .gte('scheduled_at', start.toISOString())
          .lte('scheduled_at', end.toISOString())
          .order('scheduled_at', { ascending: true }),
        supabase.from('bookings')
          .select('loved_one_id,checked_in_at,checked_out_at')
          .eq('companion_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', mStart.toISOString())
          .lte('completed_at', mEnd.toISOString()),
      ])
      if (todayRes.error) throw todayRes.error
      const rows = (todayRes.data || []) as unknown as Booking[]
      setToday(rows)
      setMonthDone((monthRes.data || []) as any[])

      // Elder profiles for upcoming visits (pre-visit notes)
      const lovedIds = Array.from(new Set(rows
        .filter(b => b.status === 'companion_assigned' && b.loved_one_id)
        .map(b => b.loved_one_id as string)))
      if (lovedIds.length) {
        const { data: eps } = await supabase.from('elder_profiles')
          .select('loved_one_id,pinned_note,continuity_notes,current_medications')
          .in('loved_one_id', lovedIds)
        const map: Record<string, Elder> = {}
        for (const e of (eps || []) as Elder[]) if (e.loved_one_id) map[e.loved_one_id] = e
        setElders(map)
      } else {
        setElders({})
      }
    } catch (err) {
      console.error('Failed to load today:', err)
      setError('Could not load your visits — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`companion-today-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `companion_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, load])

  const ptr = usePullToRefresh(load)

  const now = new Date()
  const doneToday = today.filter(b => b.status === 'completed').length
  const pendingToday = today.filter(b => b.status === 'companion_assigned' || b.status === 'in_progress').length
  const todayTotal = today.length

  // Next-visit alert: earliest upcoming within 2 hours
  const nextSoon = today
    .filter(b => b.status === 'companion_assigned' && b.scheduled_at && new Date(b.scheduled_at) > now)
    .map(b => ({ b, mins: differenceInMinutes(new Date(b.scheduled_at as string), now) }))
    .filter(x => x.mins <= 120)
    .sort((a, b) => a.mins - b.mins)[0]

  // Monthly stats
  const monthVisits = monthDone.length
  const monthHours = Math.round(monthDone.reduce((sum, b) => {
    if (!b.checked_in_at || !b.checked_out_at) return sum
    const hrs = (new Date(b.checked_out_at).getTime() - new Date(b.checked_in_at).getTime()) / 3_600_000
    return sum + Math.min(Math.max(0, hrs), 8)
  }, 0) * 10) / 10
  const monthFamilies = new Set(monthDone.map(b => b.loved_one_id).filter(Boolean)).size

  return (
    <div {...ptr.bind}>
      {ptr.indicator}

      {/* ── Greeting card ─────────────────────────────────────────────── */}
      <div className="bg-[#0E2A1F] px-4 pt-5 pb-6">
        <h1 className="text-[20px] font-bold text-white">
          {greetingFor(now)}, {firstNameOf(profile?.full_name)} 🌿
        </h1>
        <p className="text-[12px] text-white/50 mt-[3px]">{format(now, 'EEEE, d MMMM yyyy')}</p>

        <div className="mt-[18px] pt-4 border-t-[0.5px] border-white/10 flex">
          {[
            { n: todayTotal, l: 'Today' },
            { n: doneToday, l: 'Done' },
            { n: pendingToday, l: 'Pending' },
          ].map((s, i, arr) => (
            <div key={s.l} className={`flex-1 text-center px-3 ${i < arr.length - 1 ? 'border-r-[0.5px] border-white/10' : ''}`}>
              <p className="text-[24px] font-bold text-white leading-none">{loading ? '·' : s.n}</p>
              <p className="text-[10px] text-white/50 mt-[3px]">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* ── Next visit alert ──────────────────────────────────────────── */}
      {nextSoon && (
        <div className="mx-4 mt-3 bg-[#A8D5B5]/15 border border-[#A8D5B5] rounded-[14px] px-4 py-3.5 flex items-center gap-3">
          <Clock size={20} className="text-[#0E2A1F] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#0E2A1F]">
              Next visit in {nextSoon.mins < 1 ? 'under a minute' : `${nextSoon.mins} minute${nextSoon.mins === 1 ? '' : 's'}`}
            </p>
            <p className="text-[12px] text-[#6E6E73] truncate">
              {nextSoon.b.loved_ones?.full_name}{nextSoon.b.loved_ones?.address ? ` · ${nextSoon.b.loved_ones.address}` : ''}
            </p>
          </div>
          {nextSoon.b.loved_ones?.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(nextSoon.b.loved_ones.address)}`}
              target="_blank" rel="noreferrer"
              className="text-[12px] font-semibold text-[#0E2A1F] whitespace-nowrap flex-shrink-0">
              Directions →
            </a>
          )}
        </div>
      )}

      {/* ── Today's visits ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em]">Your visits today</p>
        {todayTotal > 0 && (
          <span className="bg-[#0E2A1F]/[0.08] rounded-full px-2.5 py-[3px] text-[11px] font-semibold text-[#0E2A1F]">
            {todayTotal} visit{todayTotal === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="px-4 space-y-2.5">
          {[0, 1].map(i => <div key={i} className="skeleton h-[150px] rounded-2xl" />)}
        </div>
      ) : todayTotal === 0 ? (
        <div className="mx-4 mt-12 flex flex-col items-center text-center">
          <CalendarOff size={48} className="text-[#E5E5EA] mb-4" />
          <p className="text-[18px] font-bold text-[#1D1D1F]">No visits today</p>
          <p className="text-[14px] text-[#6E6E73] mt-1.5 max-w-[240px]">Your schedule is clear. Enjoy your day.</p>
        </div>
      ) : (
        today.map(b => <VisitCard key={b.id} b={b} elder={b.loved_one_id ? elders[b.loved_one_id] : undefined} />)
      )}

      {/* ── Monthly stats ─────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 mb-6 bg-[#FAF7F2] rounded-[14px] p-4 border-[0.5px] border-[#EDE8E0]">
        <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-3.5">This month</p>
        <div className="flex">
          {[
            { n: monthVisits, l: 'Visits' },
            { n: monthHours, l: 'Hours' },
            { n: monthFamilies, l: 'Families' },
          ].map((s, i, arr) => (
            <div key={s.l} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r-[0.5px] border-[#EDE8E0]' : ''}`}>
              <p className="text-[24px] font-bold text-[#0E2A1F] leading-none">{loading ? '·' : s.n}</p>
              <p className="text-[11px] text-[#6E6E73] mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
