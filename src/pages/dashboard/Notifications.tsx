// src/pages/dashboard/Notifications.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import clsx from 'clsx'

const TYPE_ICONS: Record<string,string> = {
  booking_confirmed:'📅', companion_assigned:'👤', visit_started:'🚶',
  report_ready:'📋', emergency_alert:'🚨', payment_confirmed:'✅',
  booking_cancelled:'❌', waitlist_update:'📝',
}

export function DashboardNotifications() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{ load() },[user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
      if (error) throw error
      setNotes(data||[])
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id: string) {
    setNotes(n=>n.map(x=>x.id===id?{...x,read:true}:x))
    const { error } = await supabase.from('notifications').update({read:true}).eq('id',id)
    if (error) {
      console.error('Failed to mark notification as read:', error)
      setNotes(n=>n.map(x=>x.id===id?{...x,read:false}:x))
      showToast('Could not update notification — try again', 'error')
    }
  }

  async function markAllRead() {
    if (!user) return
    const previous = notes
    setNotes(n=>n.map(x=>({...x,read:true})))
    const { error } = await supabase.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false)
    if (error) {
      console.error('Failed to mark all notifications as read:', error)
      setNotes(previous)
      showToast('Could not update notifications — try again', 'error')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-green-900">Notifications</h1>
        {notes.some(n=>!n.read) && (
          <button onClick={markAllRead} className="text-sm text-green-600 font-medium hover:text-green-800">Mark all read</button>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
              <div className="w-8 h-8 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-semibold text-green-900">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(n=>(
            <div key={n.id} onClick={()=>!n.read&&markRead(n.id)}
              role="button"
              tabIndex={n.read?-1:0}
              onKeyDown={(e)=>{ if((e.key==='Enter'||e.key===' ') && !n.read) { e.preventDefault(); markRead(n.id) } }}
              className={clsx('flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-colors',
                n.read?'bg-white border-gray-100':'bg-green-50 border-green-100'
              )}>
              <span className="text-xl">{TYPE_ICONS[n.type]||'🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read?'text-gray-600':'font-semibold text-green-900'}`}>{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-300 mt-1">{format(new Date(n.created_at),'dd MMM · h:mm a')}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
