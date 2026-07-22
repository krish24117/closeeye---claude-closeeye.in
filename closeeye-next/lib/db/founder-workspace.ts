/**
 * Founder Workspace data — the "Today" snapshot. Live numbers only, every one from a real row via
 * admin RLS (member_queries is admin-readable; loved_ones carries region_code). It supplements the
 * existing fetchAdminOverview (which the Today page also reads for alerts / families / founding) with
 * the handful of today-specific figures the overview doesn't compute — no duplicated alert logic.
 */
import { supabase } from '@/lib/supabase'

const rupees = (paise: number) => Math.round(paise / 100)
const isToday = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString()

export interface FounderToday {
  peopleProtected: number     // total loved_ones under watch (REAL)
  familiesProtected: number   // distinct families (REAL)
  newFamiliesToday: number    // families whose first person was added today (REAL)
  questionsToday: number      // Connect questions answered today (REAL — member_queries admin RLS)
  careRequestsToday: number   // booking_requests raised today (REAL)
  revenueToday: number        // paid bookings settled today, in rupees (REAL)
  countries: number           // distinct loved_ones.region_code (REAL)
}

export async function fetchFounderToday(): Promise<FounderToday> {
  const [lo, bk, req, mq] = await Promise.all([
    supabase.from('loved_ones').select('family_user_id, created_at, region_code'),
    supabase.from('bookings').select('paid_at, amount_paise, payment_status'),
    supabase.from('booking_requests').select('created_at'),
    supabase.from('member_queries').select('created_at'),
  ])
  const lovedOnes = (lo.data as { family_user_id: string; created_at: string | null; region_code: string | null }[] | null) ?? []
  const bookings = (bk.data as { paid_at: string | null; amount_paise: number | null; payment_status: string | null }[] | null) ?? []
  const reqs = (req.data as { created_at: string | null }[] | null) ?? []
  const queries = (mq.data as { created_at: string | null }[] | null) ?? []

  return {
    peopleProtected: lovedOnes.length,
    familiesProtected: new Set(lovedOnes.map((l) => l.family_user_id)).size,
    newFamiliesToday: new Set(lovedOnes.filter((l) => isToday(l.created_at)).map((l) => l.family_user_id)).size,
    questionsToday: queries.filter((q) => isToday(q.created_at)).length,
    careRequestsToday: reqs.filter((r) => isToday(r.created_at)).length,
    revenueToday: rupees(bookings.filter((b) => b.payment_status === 'paid' && isToday(b.paid_at)).reduce((s, b) => s + (b.amount_paise ?? 0), 0)),
    countries: new Set(lovedOnes.map((l) => (l.region_code || 'IN').toUpperCase())).size,
  }
}
