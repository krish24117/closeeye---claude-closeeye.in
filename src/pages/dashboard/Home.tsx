// src/pages/dashboard/Home.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Heart, FileText, Bell, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export function DashboardHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ bookings:0, lovedOnes:0, reports:0, unread:0 })

  useEffect(()=>{
    async function load() {
      const [b,l,r,n] = await Promise.all([
        supabase.from('bookings').select('id',{count:'exact',head:true}),
        supabase.from('loved_ones').select('id',{count:'exact',head:true}),
        supabase.from('visit_reports').select('id',{count:'exact',head:true}),
        supabase.from('notifications').select('id',{count:'exact',head:true}).eq('read',false),
      ])
      setStats({ bookings:b.count||0, lovedOnes:l.count||0, reports:r.count||0, unread:n.count||0 })
    }
    load()
  },[])

  const cards = [
    { icon:Calendar, label:'Total Bookings', value:stats.bookings, href:'/dashboard/bookings', color:'bg-blue-50 text-blue-700' },
    { icon:Heart, label:'Loved Ones', value:stats.lovedOnes, href:'/dashboard/loved-ones', color:'bg-pink-50 text-pink-700' },
    { icon:FileText, label:'Visit Reports', value:stats.reports, href:'/dashboard/reports', color:'bg-amber-50 text-amber-700' },
    { icon:Bell, label:'Unread Alerts', value:stats.unread, href:'/dashboard/notifications', color:'bg-green-50 text-green-700' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Good evening, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's how your family is doing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c=>(
          <Link key={c.label} to={c.href} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-card transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={18} />
            </div>
            <p className="font-serif text-3xl text-green-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-br from-green-800 to-green-700 rounded-2xl p-7 text-white">
        <h2 className="font-serif text-xl mb-2">Book a visit</h2>
        <p className="text-white/65 text-sm mb-5">Schedule a companion visit, hospital trip, or emergency support.</p>
        <Link to="/dashboard/bookings" className="inline-flex items-center gap-2 bg-white text-green-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors">
          <Plus size={16}/> New booking
        </Link>
      </div>
    </div>
  )
}
