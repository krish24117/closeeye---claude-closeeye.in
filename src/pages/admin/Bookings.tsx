import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { ChevronDown } from 'lucide-react'

const ALL_STATUSES = ['pending', 'confirmed', 'companion_assigned', 'in_progress', 'completed', 'cancelled']

// Admin-specific status badge: completed = grey, in_progress = green pulse
const BADGE: Record<string, string> = {
  pending:            'bg-amber-100 text-amber-700',
  confirmed:          'bg-blue-100 text-blue-700',
  companion_assigned: 'bg-purple-100 text-purple-700',
  in_progress:        'bg-green-100 text-green-700',
  completed:          'bg-gray-100 text-gray-500',
  cancelled:          'bg-red-100 text-red-600',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending:  'bg-orange-50 text-orange-700',
  received: 'bg-green-100 text-green-700',
  paid:     'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-700',
}

function StatusLabel({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE[status] || 'bg-gray-100 text-gray-500'}`}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function AdminBookings() {
  const { showToast } = useToast()
  const [bookings, setBookings] = useState<any[]>([])
  const [companions, setCompanions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [payoutInputs, setPayoutInputs] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, companionsRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, loved_ones(full_name,city), companions(full_name,phone)')
          .order('created_at', { ascending: false }),
        supabase.from('companions').select('id,full_name,phone').order('full_name'),
      ])
      if (bookingsRes.error) throw bookingsRes.error
      if (companionsRes.error) throw companionsRes.error
      setBookings(bookingsRes.data || [])
      setCompanions(companionsRes.data || [])
      const payouts: Record<string, string> = {}
      ;(bookingsRes.data || []).forEach((b: any) => {
        payouts[b.id] = b.companion_payout_paise != null ? String(b.companion_payout_paise / 100) : ''
      })
      setPayoutInputs(payouts)
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function assignCompanion(b: any, companionId: string) {
    setSavingId(b.id)
    try {
      const newStatus = (b.status === 'pending' || b.status === 'confirmed') ? 'companion_assigned' : b.status
      const { error } = await supabase.from('bookings')
        .update({ companion_id: companionId || null, status: companionId ? newStatus : b.status })
        .eq('id', b.id)
      if (error) throw error
      const companion = companions.find(c => c.id === companionId)
      setBookings(prev => prev.map(x => x.id === b.id ? {
        ...x,
        companion_id: companionId || null,
        status: companionId ? newStatus : b.status,
        companions: companion ? { full_name: companion.full_name, phone: companion.phone } : null,
      } : x))
      showToast(companionId ? 'Companion assigned' : 'Companion removed', 'success')
    } catch {
      showToast('Could not assign companion — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function updateStatus(b: any, status: string) {
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status } : x))
      showToast('Status updated', 'success')
    } catch {
      showToast('Could not update status — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function markPaymentReceived(b: any) {
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings')
        .update({ payment_status: 'received', status: 'confirmed' })
        .eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, payment_status: 'received', status: 'confirmed' } : x))
      showToast('Payment received — booking confirmed', 'success')
    } catch {
      showToast('Could not update payment — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function savePayout(b: any) {
    const raw = payoutInputs[b.id]
    const payoutPaise = raw === '' || raw == null ? null : Math.round(parseFloat(raw) * 100)
    if (raw !== '' && (payoutPaise === null || isNaN(payoutPaise) || payoutPaise < 0)) {
      showToast('Enter a valid payout amount', 'error')
      return
    }
    setSavingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ companion_payout_paise: payoutPaise }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, companion_payout_paise: payoutPaise } : x))
      showToast('Payout saved', 'success')
    } catch {
      showToast('Could not save payout — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  // Sort: unassigned (active) first, then by created_at desc
  const filtered = bookings
    .filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return b.loved_ones?.full_name?.toLowerCase().includes(q) ||
               b.companions?.full_name?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const aUnassigned = !a.companion_id && !['completed', 'cancelled'].includes(a.status)
      const bUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
      if (aUnassigned && !bUnassigned) return -1
      if (!aUnassigned && bUnassigned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const unassignedCount = bookings.filter(b => !b.companion_id && !['completed', 'cancelled'].includes(b.status)).length

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {bookings.length} total
            {unassignedCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· {unassignedCount} need a companion</span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-white"
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search family or companion…"
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        />
      </div>

      {/* Booking cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-semibold text-green-900">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different filter or search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const isUnassigned = !b.companion_id && !['completed', 'cancelled'].includes(b.status)
            const isSaving = savingId === b.id
            const payoutRupees = b.companion_payout_paise != null ? `₹${(b.companion_payout_paise / 100).toLocaleString('en-IN')}` : null
            const amountRupees = b.amount_paise ? `₹${(b.amount_paise / 100).toLocaleString('en-IN')}` : '—'

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border border-gray-100 ${isUnassigned ? 'border-l-4 border-l-amber-400' : ''} transition-all`}
              >
                <div className="px-4 py-3">
                  {/* Line 1: Service · status badge · amount · payout */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <p className="font-semibold text-green-900 text-sm truncate flex-1 min-w-0">
                      {SERVICE_NAMES[b.service_type] || b.service_type}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isUnassigned && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg whitespace-nowrap">
                          NEEDS COMPANION
                        </span>
                      )}
                      <StatusLabel status={b.status} />
                      <span className="text-xs font-semibold text-green-800">{amountRupees}</span>
                    </div>
                  </div>

                  {/* Line 2: Family · city · date */}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {b.loved_ones?.full_name || '—'}
                    {b.loved_ones?.city ? ` · ${b.loved_ones.city}` : ''}
                    {b.scheduled_at ? ` · ${format(new Date(b.scheduled_at), 'd MMM, h:mm a')}` : ''}
                    {payoutRupees ? ` · payout ${payoutRupees}` : ''}
                  </p>

                  {/* Payment badge + mark received */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PAYMENT_BADGE[b.payment_status] || 'bg-gray-100 text-gray-400'}`}>
                      {b.payment_status === 'paid' || b.payment_status === 'received' ? 'Paid' : 'Payment pending'}
                    </span>
                    {b.payment_status === 'pending' && (
                      <button
                        onClick={() => markPaymentReceived(b)}
                        disabled={isSaving}
                        className="text-[10px] font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                      >
                        ✓ Mark received
                      </button>
                    )}
                  </div>
                </div>

                {/* Line 3: Companion dropdown + status select + payout */}
                <div className="border-t border-gray-50 px-4 py-2.5 flex flex-wrap gap-2 items-center">
                  {/* Companion assign */}
                  <div className="relative flex-1 min-w-[140px]">
                    <select
                      value={b.companion_id || ''}
                      onChange={e => assignCompanion(b, e.target.value)}
                      disabled={isSaving}
                      className={`w-full text-xs border-2 rounded-xl px-2.5 py-1.5 pr-6 focus:outline-none focus:border-green-600 appearance-none bg-white disabled:opacity-50 ${isUnassigned ? 'border-amber-200 text-amber-700' : 'border-gray-200 text-gray-700'}`}
                    >
                      <option value="">— Assign companion —</option>
                      {companions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Status select */}
                  <div className="relative">
                    <select
                      value={b.status}
                      onChange={e => updateStatus(b, e.target.value)}
                      disabled={isSaving}
                      className="text-xs border-2 border-gray-200 rounded-xl px-2.5 py-1.5 pr-6 focus:outline-none focus:border-green-600 appearance-none bg-white disabled:opacity-50 text-gray-700"
                    >
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Payout input + save */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={payoutInputs[b.id] ?? ''}
                      onChange={e => setPayoutInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                      placeholder="Payout"
                      className="w-20 border-2 border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-green-600"
                    />
                    <button
                      type="button"
                      onClick={() => setPayoutInputs(prev => ({ ...prev, [b.id]: String(Math.round((b.amount_paise || 0) * 0.7 / 100)) }))}
                      className="text-[10px] text-gray-400 hover:text-gray-600 whitespace-nowrap"
                    >
                      70%
                    </button>
                    <button
                      type="button"
                      onClick={() => savePayout(b)}
                      disabled={isSaving}
                      className="text-[10px] font-semibold bg-green-800 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSaving ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
