import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  format, startOfWeek, endOfWeek, subWeeks, addWeeks,
  startOfMonth, endOfMonth, subMonths, addMonths,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_COLORS, SERVICE_NAMES } from '@/lib/booking-labels'

type ViewMode = 'week' | 'month' | 'all'

function BookingCard({ b }: { b: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-2">
        <div>
          <p className="font-semibold text-green-900">{b.loved_ones?.full_name}</p>
          <p className="text-xs text-gray-400">{b.loved_ones?.city} · {b.loved_ones?.address}</p>
          {b.scheduled_at && <p className="text-xs text-green-600 font-medium mt-1">{format(new Date(b.scheduled_at), 'h:mm a')}</p>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
          {b.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 inline-block">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
    </div>
  )
}

export function CompanionSchedule() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('week')
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const [monthAnchor, setMonthAnchor] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('*, loved_ones(full_name,city,address)')
        .eq('companion_id', user.id)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load schedule:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your schedule...</div>

  const bookingsOnDay = (day: Date) => bookings.filter(b => b.scheduled_at && isSameDay(new Date(b.scheduled_at), day))

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const monthStart = startOfMonth(monthAnchor)
  const monthEnd = endOfMonth(monthAnchor)
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) })

  const allGroups: Record<string, any[]> = {}
  for (const b of bookings) {
    const key = b.scheduled_at ? format(new Date(b.scheduled_at), 'EEEE, dd MMM yyyy') : 'Unscheduled'
    if (!allGroups[key]) allGroups[key] = []
    allGroups[key].push(b)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl text-green-900">Schedule</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['week', 'month', 'all'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors ${view === v ? 'bg-white text-green-800 shadow-sm' : 'text-gray-400 hover:text-green-800'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {view === 'week' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekAnchor(subWeeks(weekAnchor, 1))} className="p-2 rounded-xl text-gray-400 hover:text-green-800 hover:bg-gray-50 transition-colors" aria-label="Previous week">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-green-900">{format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}</p>
            <button onClick={() => setWeekAnchor(addWeeks(weekAnchor, 1))} className="p-2 rounded-xl text-gray-400 hover:text-green-800 hover:bg-gray-50 transition-colors" aria-label="Next week">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="space-y-6">
            {weekDays.map(day => {
              const items = bookingsOnDay(day)
              return (
                <div key={day.toISOString()}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isToday(day) ? 'text-green-700' : 'text-gray-400'}`}>
                    {format(day, 'EEEE, dd MMM')}{isToday(day) ? ' · Today' : ''}
                  </p>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-300 italic px-1">No visits</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map(b => <BookingCard key={b.id} b={b} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setMonthAnchor(subMonths(monthAnchor, 1))} className="p-2 rounded-xl text-gray-400 hover:text-green-800 hover:bg-gray-50 transition-colors" aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-green-900">{format(monthAnchor, 'MMMM yyyy')}</p>
            <button onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))} className="p-2 rounded-xl text-gray-400 hover:text-green-800 hover:bg-gray-50 transition-colors" aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <p key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</p>
            ))}
            {monthDays.map(day => {
              const items = bookingsOnDay(day)
              const inMonth = isSameMonth(day, monthAnchor)
              const selected = isSameDay(day, selectedDay)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-colors ${
                    selected ? 'bg-green-800 text-white' : isToday(day) ? 'bg-green-50 text-green-800 font-semibold' : inMonth ? 'text-green-900 hover:bg-gray-50' : 'text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {format(day, 'd')}
                  {items.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-green-600'}`} />}
                </button>
              )
            })}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{format(selectedDay, 'EEEE, dd MMM yyyy')}</p>
            {bookingsOnDay(selectedDay).length === 0 ? (
              <p className="text-sm text-gray-300 italic px-1">No visits on this day.</p>
            ) : (
              <div className="space-y-3">
                {bookingsOnDay(selectedDay).map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'all' && (
        bookings.length === 0 ? (
          <div className="text-center py-20 bg-green-50 rounded-2xl">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="font-semibold text-green-900">No visits scheduled yet</p>
            <p className="text-sm text-gray-400 mt-1">Your visits will appear here once assigned</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(allGroups).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{date}</p>
                <div className="space-y-3">
                  {items.map(b => <BookingCard key={b.id} b={b} />)}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
