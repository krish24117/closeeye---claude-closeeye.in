import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { STATUS_COLORS, SERVICE_NAMES } from '@/lib/booking-labels'

const ALL_STATUSES = ['pending', 'confirmed', 'companion_assigned', 'in_progress', 'completed', 'cancelled']

const PAYMENT_BADGES: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700',
  received: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}
const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Payment pending',
  received: 'Payment received',
  paid: 'Paid',
  failed: 'Payment failed',
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
          .select('*, loved_ones(full_name,city,family_user_id), companions(full_name,phone)')
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
        .update({ companion_id: companionId || null, status: newStatus })
        .eq('id', b.id)
      if (error) throw error
      const companion = companions.find(c => c.id === companionId)
      setBookings(prev => prev.map(x => x.id === b.id ? {
        ...x,
        companion_id: companionId || null,
        status: newStatus,
        companions: companion ? { full_name: companion.full_name, phone: companion.phone } : null,
      } : x))
      showToast('Companion assigned', 'success')
    } catch (err) {
      console.error('Failed to assign companion:', err)
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
    } catch (err) {
      console.error('Failed to update status:', err)
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
      showToast('Payment marked as received — booking confirmed', 'success')
    } catch (err) {
      console.error('Failed to update payment:', err)
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
    } catch (err) {
      console.error('Failed to save payout:', err)
      showToast('Could not save payout — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  function suggestPayout(b: any) {
    const suggested = Math.round((b.amount_paise || 0) * 0.7 / 100)
    setPayoutInputs(prev => ({ ...prev, [b.id]: String(suggested) }))
  }

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchesLoved = b.loved_ones?.full_name?.toLowerCase().includes(q)
      const matchesCompanion = b.companions?.full_name?.toLowerCase().includes(q)
      if (!matchesLoved && !matchesCompanion) return false
    }
    return true
  })

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
        <p className="text-gray-400 text-sm mt-1">Assign companions and manage booking status.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by family or companion name..."
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-green-900">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different filter or search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-green-900 text-sm">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.loved_ones?.full_name} · {b.loved_ones?.city}</p>
                  {b.scheduled_at && <p className="text-xs text-gray-400">{format(new Date(b.scheduled_at), 'dd MMM yyyy, h:mm a')}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                  <p className="text-sm font-semibold text-green-800 mt-2">₹{(b.amount_paise / 100).toLocaleString('en-IN')}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${PAYMENT_BADGES[b.payment_status] || 'bg-gray-100 text-gray-500'}`}>
                    {PAYMENT_LABELS[b.payment_status] || b.payment_status}
                  </span>
                  {b.payment_status === 'pending' && (
                    <button
                      onClick={() => markPaymentReceived(b)}
                      disabled={savingId === b.id}
                      className="block text-xs font-semibold text-green-700 hover:text-green-800 disabled:opacity-50 mt-1.5"
                    >
                      ✓ Mark received
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1.5">Companion</label>
                  <select
                    value={b.companion_id || ''}
                    onChange={e => assignCompanion(b, e.target.value)}
                    disabled={savingId === b.id}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 disabled:opacity-50"
                  >
                    <option value="">— Unassigned —</option>
                    {companions.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                  {b.companions?.phone && <p className="text-xs text-gray-400 mt-1">{b.companions.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1.5">Status</label>
                  <select
                    value={b.status}
                    onChange={e => updateStatus(b, e.target.value)}
                    disabled={savingId === b.id}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 disabled:opacity-50"
                  >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1.5">Companion payout (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={payoutInputs[b.id] ?? ''}
                      onChange={e => setPayoutInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                      placeholder="Not set"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                    />
                    <button
                      type="button"
                      onClick={() => suggestPayout(b)}
                      className="text-xs font-semibold text-green-700 hover:text-green-800 whitespace-nowrap px-2"
                    >
                      Suggest 70%
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => savePayout(b)}
                    disabled={savingId === b.id}
                    className="mt-2 text-xs font-semibold bg-green-800 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {savingId === b.id ? 'Saving...' : 'Save payout'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
