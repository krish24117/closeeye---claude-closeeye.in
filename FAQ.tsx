// src/pages/dashboard/Layout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Calendar, Heart, FileText, Bell, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import clsx from 'clsx'

const NAV = [
  { to:'/dashboard', icon:Home, label:'Overview', end:true },
  { to:'/dashboard/bookings', icon:Calendar, label:'Bookings' },
  { to:'/dashboard/loved-ones', icon:Heart, label:'Loved Ones' },
  { to:'/dashboard/reports', icon:FileText, label:'Visit Reports' },
  { to:'/dashboard/notifications', icon:Bell, label:'Notifications' },
]

export function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-green-900 text-white flex flex-col transition-transform duration-200',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-white/10">
          <p className="font-serif text-xl">close <span className="text-green-300">eye</span></p>
          <p className="text-xs text-white/50 mt-1">Family Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(n=>(
            <NavLink key={n.to} to={n.to} end={n.end}
              onClick={()=>setOpen(false)}
              className={({isActive})=>clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              )}>
              <n.icon size={17} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
              {profile?.full_name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-white/40">Family account</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={()=>setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 md:ml-64">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 md:hidden">
          <button onClick={()=>setOpen(!open)} className="text-green-800">
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
          <p className="font-serif text-lg text-green-900">close eye</p>
        </header>
        <main className="p-6 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
