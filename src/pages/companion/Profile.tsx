import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BadgeCheck, Award, Check, ChevronRight, History,
  Phone, MessageCircle, Wallet, CalendarDays, Bell,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { initialsOf } from './_shared'
import { PUSH_SUPPORTED, getNotificationPermission, requestNotificationPermission } from '@/lib/push-notifications'

const SUPPORT_PHONE = '+919000221261'
const TRAINING = ['Elder care fundamentals', 'Health observation', 'Emergency protocols']

export function CompanionProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [companion, setCompanion] = useState<any>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [completed, setCompleted] = useState<{ loved_one_id: string | null; completed_at: string | null }[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState(getNotificationPermission())

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [compRes, bookRes, visRes] = await Promise.all([
        supabase.from('companions').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('bookings').select('loved_one_id,completed_at').eq('companion_id', user.id).eq('status', 'completed'),
        supabase.from('visits').select('id,one_moment,start_time,end_time,created_at,flags,elder_profiles(name)').eq('companion_id', user.id).order('created_at', { ascending: false }).limit(5),
      ])
      setCompanion(compRes.data || null)
      setCompleted((bookRes.data || []) as any[])
      setRecent(visRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (companion?.photo_url) {
      supabase.storage.from('companion-photos').createSignedUrl(companion.photo_url, 3600)
        .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null))
    }
  }, [companion?.photo_url])

  const name = companion?.full_name || profile?.full_name || 'Companion'
  const isVerified = !!companion?.is_verified
  const status = companion?.status as string | undefined
  const rating = companion?.rating as number | null | undefined

  const now = new Date()
  const monthStart = startOfMonth(now), monthEnd = endOfMonth(now)
  const totalVisits = completed.length
  const monthVisits = completed.filter(b => b.completed_at && isWithinInterval(new Date(b.completed_at), { start: monthStart, end: monthEnd })).length
  const elderCount = new Set(completed.map(b => b.loved_one_id).filter(Boolean)).size

  // No training column in the schema → derive a sensible state from verification.
  const trainingDone = isVerified ? 3 : status === 'approved' ? 2 : 1

  async function handleSignOut() {
    await signOut()
    window.location.replace('/auth')
  }

  async function enableNotifications() {
    setPermission(await requestNotificationPermission())
  }

  return (
    <div className="pb-2">
      {/* Profile header */}
      <div className="bg-[#0E2A1F] px-4 pt-7 pb-7 flex flex-col items-center text-center">
        {photoUrl ? (
          <img src={photoUrl} alt="Your profile photo" className="w-20 h-20 rounded-full object-cover border-2 border-[#A8D5B5]" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-[#A8D5B5] flex items-center justify-center">
            <span className="text-[26px] font-bold text-white">{initialsOf(name)}</span>
          </div>
        )}
        <p className="text-[22px] font-bold text-white mt-3.5">{name}</p>
        <p className="text-[13px] text-white/60">Close Eye Companion</p>

        <div className="mt-3">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 bg-[#A8D5B5]/15 border border-[#A8D5B5] rounded-full px-4 py-1.5">
              <BadgeCheck size={14} className="text-[#A8D5B5]" />
              <span className="text-[12px] font-semibold text-[#A8D5B5]">Close Eye Certified</span>
            </span>
          ) : status === 'approved' ? (
            <span className="inline-flex items-center gap-1.5 bg-[#F59E0B]/15 border border-[#F59E0B] rounded-full px-4 py-1.5">
              <span className="text-[12px] font-semibold text-[#F59E0B]">Training complete · Awaiting certification</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5">
              <span className="text-[12px] font-semibold text-white/70">In training</span>
            </span>
          )}
        </div>
      </div>

      {/* Performance cards */}
      <div className="grid grid-cols-2 gap-2 mx-4 mt-3">
        {[
          { l: 'Total visits', v: loading ? '·' : totalVisits },
          { l: 'This month', v: loading ? '·' : monthVisits },
          { l: 'Elders', v: loading ? '·' : elderCount },
          { l: 'Rating', v: rating != null ? `${rating.toFixed(1)} ★` : '—' },
        ].map(c => (
          <div key={c.l} className="bg-white rounded-[12px] p-4 border-[0.5px] border-[#E5E5EA]">
            <p className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-[0.06em] mb-1.5">{c.l}</p>
            <p className="text-[26px] font-bold text-[#0E2A1F] leading-none">{c.v}</p>
          </div>
        ))}
      </div>

      {/* Training */}
      <div className="bg-white rounded-[14px] mx-4 mt-2.5 p-4 border-[0.5px] border-[#E5E5EA]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-[#1D1D1F] flex items-center gap-2">
            <Award size={16} className="text-[#0E2A1F]" /> Training
          </span>
          <span className="text-[12px] text-[#6E6E73]">{trainingDone} of 3 complete</span>
        </div>
        <div className="h-1.5 bg-[#E5E5EA] rounded-full mb-3">
          <div className="h-full bg-[#0E2A1F] rounded-full transition-[width] duration-500" style={{ width: `${(trainingDone / 3) * 100}%` }} />
        </div>
        {TRAINING.map((m, i) => {
          const done = i < trainingDone
          return (
            <div key={m} className="flex items-center gap-3 py-2.5 border-b-[0.5px] border-[#F5F5F5] last:border-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#0E2A1F]' : 'bg-[#F5F5F5]'}`}>
                {done ? <Check size={12} className="text-white" /> : <span className="text-[12px] text-[#6E6E73]">{i + 1}</span>}
              </div>
              <span className={`text-[13px] font-semibold flex-1 ${done ? 'text-[#6E6E73]' : 'text-[#1D1D1F]'}`}>{m}</span>
              <span className={`text-[12px] font-medium ${done ? 'text-[#0E2A1F]' : 'text-[#6E6E73]'}`}>{done ? 'Complete' : 'Pending'}</span>
            </div>
          )
        })}
      </div>

      {/* Recent visits */}
      <div className="bg-white rounded-[14px] mx-4 mt-2.5 p-4 border-[0.5px] border-[#E5E5EA]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold text-[#1D1D1F] flex items-center gap-2">
            <History size={16} className="text-[#0E2A1F]" /> Recent visits
          </span>
          <Link to="/companion/visits" className="text-[12px] font-semibold text-[#0E2A1F]">View all →</Link>
        </div>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
        ) : recent.length === 0 ? (
          <p className="text-[13px] text-[#6E6E73] py-1">No completed visits yet.</p>
        ) : (
          recent.map(v => (
            <div key={v.id} className="py-2.5 border-b-[0.5px] border-[#F5F5F5] last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1D1D1F]">{v.elder_profiles?.name || 'Elder'}</span>
                <span className="text-[11px] text-[#6E6E73]">{format(new Date(v.end_time || v.created_at), 'dd MMM')}</span>
              </div>
              {v.one_moment && <p className="text-[12px] text-[#6E6E73] italic mt-0.5 line-clamp-1">"{v.one_moment}"</p>}
            </div>
          ))
        )}
      </div>

      {/* Quick links to retained features */}
      <div className="grid grid-cols-2 gap-2 mx-4 mt-2.5">
        <Link to="/companion/earnings" className="bg-white rounded-[12px] p-4 border-[0.5px] border-[#E5E5EA] flex items-center gap-2.5 ce-press">
          <Wallet size={18} className="text-[#0E2A1F]" />
          <span className="text-[13px] font-semibold text-[#1D1D1F]">Earnings</span>
        </Link>
        <Link to="/companion/schedule" className="bg-white rounded-[12px] p-4 border-[0.5px] border-[#E5E5EA] flex items-center gap-2.5 ce-press">
          <CalendarDays size={18} className="text-[#0E2A1F]" />
          <span className="text-[13px] font-semibold text-[#1D1D1F]">Schedule</span>
        </Link>
      </div>

      {/* Support */}
      <div className="bg-[#FAF7F2] rounded-[14px] mx-4 mt-2.5 p-4">
        <p className="text-[14px] font-bold text-[#1D1D1F] mb-3">Need help?</p>
        <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-3 bg-white border-[0.5px] border-[#E5E5EA] rounded-[12px] p-3.5 mb-2 ce-press min-h-[48px]">
          <span className="w-9 h-9 rounded-full bg-[#0E2A1F] flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-white" /></span>
          <span>
            <span className="block text-[14px] font-semibold text-[#1D1D1F]">Call Krishna</span>
            <span className="block text-[12px] text-[#6E6E73]">+91 90002 21261</span>
          </span>
        </a>
        <a href={`https://wa.me/919000221261`} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white border-[0.5px] border-[#E5E5EA] rounded-[12px] p-3.5 ce-press min-h-[48px]">
          <span className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0"><MessageCircle size={16} className="text-white" /></span>
          <span>
            <span className="block text-[14px] font-semibold text-[#1D1D1F]">WhatsApp support</span>
            <span className="block text-[12px] text-[#6E6E73]">Usually responds quickly</span>
          </span>
        </a>

        {/* Visit alerts (kept from the previous portal) */}
        {PUSH_SUPPORTED && permission !== 'granted' && permission !== 'denied' && (
          <button onClick={enableNotifications} className="flex items-center gap-3 bg-white border-[0.5px] border-[#E5E5EA] rounded-[12px] p-3.5 mt-2 w-full text-left ce-press min-h-[48px]">
            <span className="w-9 h-9 rounded-full bg-[#A8D5B5]/30 flex items-center justify-center flex-shrink-0"><Bell size={16} className="text-[#0E2A1F]" /></span>
            <span>
              <span className="block text-[14px] font-semibold text-[#1D1D1F]">Enable visit alerts</span>
              <span className="block text-[12px] text-[#6E6E73]">Get notified of new assignments</span>
            </span>
            <ChevronRight size={16} className="text-[#6E6E73] ml-auto" />
          </button>
        )}
        {permission === 'granted' && (
          <p className="flex items-center gap-2 text-[12px] text-[#0E2A1F] font-medium mt-2.5 px-1">
            <span className="w-2 h-2 bg-[#16a34a] rounded-full" /> Visit alerts enabled
          </p>
        )}
      </div>

      <button onClick={handleSignOut} className="w-full text-center text-[13px] text-[#6E6E73] py-3 mt-2">
        Sign out
      </button>
    </div>
  )
}
