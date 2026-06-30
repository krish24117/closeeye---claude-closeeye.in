import { createContext, useContext, ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'

/* ---------- formatting helpers ---------- */
export const inr = (paise?: number | null) =>
  `₹${Math.round((paise ?? 0) / 100).toLocaleString('en-IN')}`
export const inrRupees = (rupees?: number | null) =>
  `₹${Math.round(rupees ?? 0).toLocaleString('en-IN')}`

export const initials = (name?: string | null) =>
  (name || 'CE').trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()

export const istDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const istShortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }) : '—'
export const istTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'
export const timeAgo = (iso?: string | null) => {
  if (!iso) return '—'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '—' }
}
export const durationMin = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  return m > 0 && m < 600 ? m : null
}

/* ---------- tone maps ---------- */
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

export const bookingTone = (status?: string | null): { label: string; tone: Tone } => {
  switch (status) {
    case 'completed': return { label: 'Done', tone: 'green' }
    case 'in_progress': return { label: 'In progress', tone: 'blue' }
    case 'companion_assigned': return { label: 'Assigned', tone: 'blue' }
    case 'confirmed': return { label: 'Confirmed', tone: 'green' }
    case 'cancelled': return { label: 'Cancelled', tone: 'gray' }
    case 'needs_details': return { label: 'Needs details', tone: 'red' }
    case 'requested': return { label: 'Request received', tone: 'amber' }
    case 'scheduled': return { label: 'Scheduled', tone: 'blue' }
    case 'companion_confirmed': return { label: 'Companion confirmed', tone: 'blue' }
    case 'paid': return { label: 'Visit confirmed', tone: 'green' }
    default: return { label: 'Pending', tone: 'amber' }
  }
}
export const flagTone = (flag?: string | null): { label: string; tone: Tone } => {
  switch (flag) {
    case 'urgent': return { label: 'Flagged', tone: 'red' }
    case 'monitor': return { label: 'Monitor', tone: 'amber' }
    default: return { label: 'All well', tone: 'green' }
  }
}
export const queryTone = (status?: string | null): { label: string; tone: Tone } => {
  switch (status) {
    case 'doctor_reviewed': return { label: 'Verified', tone: 'green' }
    case 'ai_answered': return { label: 'AI · pending review', tone: 'amber' }
    default: return { label: 'Pending review', tone: 'purple' }
  }
}
export const payTone = (status?: string | null): { label: string; tone: Tone } => {
  switch (status) {
    case 'paid': case 'received': return { label: 'Paid', tone: 'green' }
    case 'failed': return { label: 'Failed', tone: 'red' }
    case 'refunded': return { label: 'Refunded', tone: 'gray' }
    default: return { label: 'Pending', tone: 'amber' }
  }
}
export const SERVICE_LABELS: Record<string, string> = {
  companion_visit_single: 'Home Visit',
  home_visit: 'Home Visit',
  doctor_visit_support: 'Doctor Visit Support',
  hospital_assistance_half_day: 'Hospital Half Day',
  hospital_assistance_full_day: 'Hospital Full Day',
  emergency_support_visit: 'Emergency Visit',
  grocery_medicine_assistance: 'Grocery & Medicine',
  home_maintenance_coordination: 'Home Maintenance',
}
export const serviceLabel = (id?: string | null) =>
  (id && (SERVICE_LABELS[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))) || 'Service'

/* ---------- UI primitives ---------- */
export function Avatar({ name, src, size = 30 }: { name?: string | null; src?: string | null; size?: number }) {
  return (
    <span className="adm-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <img src={src} alt={name ? `${name}'s photo` : 'Profile photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
    </span>
  )
}

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`adm-badge ${tone}`}>{children}</span>
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`adm-card adm-card-pad ${className}`} style={style}>{children}</div>
}

export function StatCard({ label, value, sub, subTone, alert }: { label: string; value: ReactNode; sub?: ReactNode; subTone?: 'pos' | 'warn' | 'urgent'; alert?: boolean }) {
  return (
    <div className={`adm-card adm-card-pad${alert ? ' alert' : ''}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      {sub != null && <div className={`adm-stat-sub${subTone ? ' adm-' + subTone : ''}`}>{sub}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <h1 className="adm-page-h">{title}</h1>
        {subtitle && <p className="adm-page-sub" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-mid)' }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-dark)', margin: '0 0 4px' }}>{title}</p>
      {sub && <p style={{ fontSize: 13, margin: 0 }}>{sub}</p>}
    </div>
  )
}

export function ErrorBox({ onRetry }: { onRetry?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <p style={{ fontSize: 14, color: 'var(--gray-dark)', margin: '0 0 10px' }}>Connection issue — couldn’t load this.</p>
      {onRetry && <button className="adm-btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="adm-card" style={{ height: h, opacity: 0.6 }} />
}

/* ---------- admin context (provided by AdminLayout) ---------- */
export type AdminRole = 'super_admin' | 'companion' | 'doctor'
export interface AdminCtx {
  adminRole: AdminRole
  counts: { pendingVisits: number; unreviewedQueries: number }
  refreshCounts: () => void
  openSearch: () => void
  openNotifs: () => void
}
export const AdminContext = createContext<AdminCtx>({
  adminRole: 'super_admin',
  counts: { pendingVisits: 0, unreviewedQueries: 0 },
  refreshCounts: () => {},
  openSearch: () => {},
  openNotifs: () => {},
})
export const useAdmin = () => useContext(AdminContext)
