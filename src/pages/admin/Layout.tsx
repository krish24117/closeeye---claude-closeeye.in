import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, PersonStanding, MessageCircle, Calendar, Clock, Users,
  Building2, HeartHandshake, Accessibility, Stethoscope, Banknote, Receipt,
  CreditCard, ClipboardList, FileText, Download, Settings, Search,
  Bell, Menu, X, Plus, ChevronRight, Home, Star,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import {
  AdminContext, AdminRole, Avatar, timeAgo, inr, serviceLabel,
} from './_shared'

type NavItem = { to: string; icon: React.ComponentType<{ size?: number | string }>; label: string; badge?: 'pendingVisits' | 'unreviewedQueries'; badgeTone?: 'red' | 'amber'; end?: boolean }
type NavSection = { label: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  { label: 'Operations', items: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/visits', icon: PersonStanding, label: 'Visits', badge: 'pendingVisits', badgeTone: 'amber' },
    { to: '/admin/queries', icon: MessageCircle, label: 'Health queries', badge: 'unreviewedQueries', badgeTone: 'red' },
    { to: '/admin/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/admin/live-map', icon: Clock, label: 'Schedules' },
  ] },
  { label: 'People', items: [
    { to: '/admin/founding-members', icon: Star, label: 'Founding members' },
    { to: '/admin/families', icon: Users, label: 'Families' },
    // { to: '/admin/societies', icon: Building2, label: 'Societies' }, // disabled
    { to: '/admin/companions', icon: HeartHandshake, label: 'Companions' },
    { to: '/admin/elders', icon: Accessibility, label: 'Elders' },
    { to: '/admin/doctors', icon: Stethoscope, label: 'Doctors' },
  ] },
  { label: 'Finance', items: [
    { to: '/admin/revenue', icon: Banknote, label: 'Revenue' },
    { to: '/admin/payments', icon: Receipt, label: 'Payments' },
    { to: '/admin/plans', icon: CreditCard, label: 'Plans' },
  ] },
  { label: 'Reports', items: [
    { to: '/admin/reports', icon: ClipboardList, label: 'Visit reports' },
    { to: '/admin/health-reports', icon: FileText, label: 'Health reports' },
    { to: '/admin/export', icon: Download, label: 'Export data' },
  ] },
  { label: 'Settings', items: [
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ] },
]

const TITLES: { match: string; title: string; crumb: string }[] = [
  { match: '/admin/visits', title: 'Visits', crumb: 'Operations / Visits' },
  { match: '/admin/queries', title: 'Health queries', crumb: 'Operations / Health queries' },
  { match: '/admin/bookings', title: 'Bookings', crumb: 'Operations / Bookings' },
  { match: '/admin/founding-members', title: 'Founding members', crumb: 'People / Founding members' },
  { match: '/admin/families', title: 'Families', crumb: 'People / Families' },
  { match: '/admin/societies', title: 'Societies', crumb: 'People / Societies' },
  { match: '/admin/companions', title: 'Companions', crumb: 'People / Companions' },
  { match: '/admin/elders', title: 'Elders', crumb: 'People / Elders' },
  { match: '/admin/revenue', title: 'Revenue', crumb: 'Finance / Revenue' },
  { match: '/admin/payments', title: 'Payments', crumb: 'Finance / Payments' },
  { match: '/admin/reports', title: 'Visit reports', crumb: 'Reports / Visit reports' },
  { match: '/admin/health-reports', title: 'Health reports', crumb: 'Reports / Health reports' },
  { match: '/admin/export', title: 'Export data', crumb: 'Reports / Export data' },
  { match: '/admin/doctors', title: 'Doctors', crumb: 'People / Doctors' },
  { match: '/admin/plans', title: 'Plans', crumb: 'Finance / Plans' },
  { match: '/admin/live-map', title: 'Schedules', crumb: 'Operations / Schedules' },
  { match: '/admin/settings', title: 'Settings', crumb: 'Settings' },
  { match: '/admin', title: 'Dashboard', crumb: 'Operations / Dashboard' },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const adminRole: AdminRole = (profile?.admin_role as AdminRole) || 'super_admin'

  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ pendingVisits: 0, unreviewedQueries: 0 })
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [hasNotifs, setHasNotifs] = useState(false)

  const refreshCounts = useCallback(async () => {
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
    const [v, q] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString())
        .not('status', 'in', '("completed","cancelled")'),
      supabase.from('member_queries').select('id', { count: 'exact', head: true })
        .neq('status', 'doctor_reviewed'),
    ])
    setCounts({ pendingVisits: v.count || 0, unreviewedQueries: q.count || 0 })
  }, [])

  useEffect(() => { refreshCounts() }, [refreshCounts])

  useEffect(() => {
    const ch = supabase.channel('admin-console-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_queries' }, () => { refreshCounts(); setHasNotifs(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => { refreshCounts(); setHasNotifs(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => { refreshCounts(); setHasNotifs(true) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refreshCounts])

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  // Sub-role scoping (companion → visits only, doctor → queries only)
  if (adminRole === 'companion' && !location.pathname.startsWith('/admin/visits')) return <Navigate to="/admin/visits" replace />
  if (adminRole === 'doctor' && !location.pathname.startsWith('/admin/queries')) return <Navigate to="/admin/queries" replace />

  const visibleSections = adminRole === 'super_admin' ? SECTIONS
    : adminRole === 'companion' ? [{ label: 'Operations', items: [SECTIONS[0].items[1]] }]
    : [{ label: 'Operations', items: [SECTIONS[0].items[2]] }]

  const meta = TITLES.find(t => location.pathname.startsWith(t.match)) || TITLES[TITLES.length - 1]
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const roleLabel = adminRole === 'super_admin' ? 'Super admin' : adminRole === 'doctor' ? 'Doctor' : 'Companion'

  async function handleSignOut() { await signOut(); window.location.replace('/auth') }

  const ctx = {
    adminRole, counts, refreshCounts,
    openSearch: () => setSearchOpen(true),
    openNotifs: () => { setNotifOpen(true); setHasNotifs(false) },
  }

  return (
    <AdminContext.Provider value={ctx}>
      <div className="adm adm-shell">
        {open && <div className="adm-overlay" style={{ zIndex: 59 }} onClick={() => setOpen(false)} />}

        {/* Sidebar */}
        <aside className={`adm-sidebar${open ? ' is-open' : ''}`}>
          <div className="adm-logo">
            <Logo className="" />
            <span className="adm-logo-name">close eye</span>
            <span className="adm-pill">admin</span>
          </div>
          <nav className="adm-nav">
            {visibleSections.map(sec => (
              <div key={sec.label}>
                <div className="adm-section-label">{sec.label}</div>
                {sec.items.map((it, i) => {
                  const Icon = it.icon
                  const badgeVal = it.badge ? counts[it.badge] : 0
                  return (
                    <NavLink key={it.to + i} to={it.to} end={it.end ?? true}
                      className={({ isActive }) => `adm-nav-item${isActive ? ' is-active' : ''}`}>
                      <Icon size={16} />
                      <span className="adm-nav-label">{it.label}</span>
                      {it.badge && badgeVal > 0 && <span className={`adm-nav-badge ${it.badgeTone}`}>{badgeVal}</span>}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="adm-user">
            <Avatar name={profile?.full_name} size={30} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="adm-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Admin'}</div>
              <button className="adm-user-signout" onClick={handleSignOut}>{roleLabel} · Sign out</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="adm-main">
          <header className="adm-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button className="adm-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
              <div style={{ minWidth: 0 }}>
                <div className="adm-title">{meta.title}</div>
                <div className="adm-crumb">{meta.crumb}</div>
              </div>
            </div>
            <div className="adm-top-actions">
              <span className="adm-date">{today}</span>
              <button className="adm-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={18} /></button>
              <button className="adm-icon-btn" onClick={() => { setNotifOpen(true); setHasNotifs(false) }} aria-label="Notifications">
                <Bell size={18} />{hasNotifs && <span className="adm-dot" />}
              </button>
            </div>
          </header>

          <div className="adm-content"><Outlet /></div>
        </div>

        {/* Mobile bottom bar */}
        <nav className="adm-bottombar">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'is-active' : ''}>
            <span className="adm-bnav-icon"><Home size={24} strokeWidth={1.8} /></span>
            <span className="adm-bnav-label">Home</span>
          </NavLink>
          <NavLink to="/admin/visits" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <span className="adm-bnav-icon">
              <Calendar size={24} strokeWidth={1.8} />
              {counts.pendingVisits > 0 && <span className="adm-bnav-badge">{counts.pendingVisits > 9 ? '9+' : counts.pendingVisits}</span>}
            </span>
            <span className="adm-bnav-label">Visits</span>
          </NavLink>
          <NavLink to="/admin/queries" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <span className="adm-bnav-icon">
              <MessageCircle size={24} strokeWidth={1.8} />
              {counts.unreviewedQueries > 0 && <span className="adm-bnav-badge">{counts.unreviewedQueries > 9 ? '9+' : counts.unreviewedQueries}</span>}
            </span>
            <span className="adm-bnav-label">Queries</span>
          </NavLink>
          <NavLink to="/admin/families" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <span className="adm-bnav-icon"><Users size={24} strokeWidth={1.8} /></span>
            <span className="adm-bnav-label">Families</span>
          </NavLink>
          <button onClick={() => setOpen(true)}>
            <span className="adm-bnav-icon"><Menu size={24} strokeWidth={1.8} /></span>
            <span className="adm-bnav-label">More</span>
          </button>
        </nav>

        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} navigate={navigate} />}
        {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} navigate={navigate} />}
      </div>
    </AdminContext.Provider>
  )
}

/* ---------------- Global search ---------------- */
type SearchGroup = { label: string; items: { title: string; sub: string; to: string }[] }
function GlobalSearch({ onClose, navigate }: { onClose: () => void; navigate: (to: string) => void }) {
  const [q, setQ] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setGroups([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      const like = `%${term}%`
      const [fam, eld, qr, soc] = await Promise.all([
        supabase.from('loved_ones').select('id, full_name, family_user_id, city').ilike('full_name', like).limit(5),
        supabase.from('elder_profiles').select('id, name, loved_ones(family_user_id)').ilike('name', like).limit(5),
        supabase.from('member_queries').select('id, question, subject_label').ilike('question', like).limit(5),
        supabase.from('society_members').select('id, name, society_name').ilike('name', like).limit(5),
      ])
      const g: SearchGroup[] = []
      if (fam.data?.length) g.push({ label: 'Families', items: fam.data.map((f: any) => ({ title: f.full_name, sub: f.city || 'Family', to: `/admin/families/${f.family_user_id}` })) })
      if (eld.data?.length) g.push({ label: 'Elders', items: eld.data.map((e: any) => ({ title: e.name || 'Elder', sub: 'Elder profile', to: e.loved_ones?.family_user_id ? `/admin/families/${e.loved_ones.family_user_id}` : '/admin/elders' })) })
      if (qr.data?.length) g.push({ label: 'Health queries', items: qr.data.map((x: any) => ({ title: (x.question || '').slice(0, 50), sub: x.subject_label || 'Query', to: '/admin/queries' })) })
      // societies disabled — if (soc.data?.length) g.push({ label: 'Society members', ... })
      setGroups(g); setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="adm-search-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-search-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '0.5px solid var(--gray-light)' }}>
          <Search size={18} color="var(--gray-mid)" />
          <input autoFocus className="adm-input" style={{ border: 'none', flex: 1, padding: 0, fontSize: 15 }}
            placeholder="Search families, elders, queries…" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }} />
          <button className="adm-link" onClick={onClose}>Esc</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 8 }}>
          {loading && <p style={{ padding: 16, fontSize: 13, color: 'var(--gray-mid)' }}>Searching…</p>}
          {!loading && q.trim().length >= 2 && groups.length === 0 && <p style={{ padding: 16, fontSize: 13, color: 'var(--gray-mid)' }}>No results for “{q}”.</p>}
          {groups.map(grp => (
            <div key={grp.label} style={{ marginBottom: 8 }}>
              <div className="adm-section-label" style={{ color: 'var(--gray-mid)', padding: '8px 12px 4px' }}>{grp.label}</div>
              {grp.items.map((it, i) => (
                <button key={i} onClick={() => { navigate(it.to); onClose() }}
                  style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{it.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{it.sub}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Notifications panel ---------------- */
type Notif = { icon: string; color: string; title: string; sub: string; time: string; to: string }
function NotifPanel({ onClose, navigate }: { onClose: () => void; navigate: (to: string) => void }) {
  const [items, setItems] = useState<Notif[] | null>(null)

  useEffect(() => {
    ;(async () => {
      const [flagged, queries, paid] = await Promise.all([
        supabase.from('visits').select('id, flags, created_at, elder_profiles(name)').neq('flags', 'none').order('created_at', { ascending: false }).limit(5),
        supabase.from('member_queries').select('id, question, created_at, subject_label').neq('status', 'doctor_reviewed').order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('id, amount_paise, created_at, service_type').eq('payment_status', 'paid').order('created_at', { ascending: false }).limit(5),
      ])
      const list: Notif[] = []
      flagged.data?.forEach((v: any) => list.push({ icon: '🔴', color: '#FEE2E2', title: `Visit ${v.flags === 'urgent' ? 'flagged urgent' : 'needs monitoring'}`, sub: v.elder_profiles?.name || 'Elder', time: v.created_at, to: '/admin/visits' }))
      queries.data?.forEach((x: any) => list.push({ icon: '🟡', color: '#FEF3C7', title: 'Health query needs review', sub: (x.question || '').slice(0, 48), time: x.created_at, to: '/admin/queries' }))
      paid.data?.forEach((b: any) => list.push({ icon: '🟢', color: '#DCFCE7', title: `Payment received · ${inr(b.amount_paise)}`, sub: serviceLabel(b.service_type), time: b.created_at, to: '/admin/revenue' }))
      list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setItems(list)
    })()
  }, [])

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-notif">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '0.5px solid var(--gray-light)' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Notifications</span>
          <button className="adm-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {items === null && <p style={{ padding: 18, fontSize: 13, color: 'var(--gray-mid)' }}>Loading…</p>}
        {items && items.length === 0 && <p style={{ padding: 18, fontSize: 13, color: 'var(--gray-mid)' }}>You’re all caught up.</p>}
        {items?.map((n, i) => (
          <button key={i} onClick={() => { navigate(n.to); onClose() }}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '0.5px solid var(--gray-light)', background: 'none', cursor: 'pointer' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: n.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{n.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{n.title}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.sub}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--gray-light)' }}>{timeAgo(n.time)}</span>
            </span>
            <ChevronRight size={16} color="var(--gray-mid)" />
          </button>
        ))}
      </div>
    </>
  )
}
