// src/pages/companion/Layout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import clsx from 'clsx'

export function CompanionLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-green-900 text-white flex flex-col fixed inset-y-0 left-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-serif text-lg">close <span className="text-green-300">eye</span></p>
          <p className="text-xs text-white/40 mt-0.5">Companion Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/companion" end className={({isActive})=>clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',isActive?'bg-white/15 text-white':'text-white/60 hover:text-white hover:bg-white/10')}>
            <Home size={16}/> My Visits
          </NavLink>
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-sm font-medium text-white mb-3">{profile?.full_name}</p>
          <button onClick={async()=>{ await signOut(); navigate('/') }} className="flex items-center gap-2 text-xs text-white/50 hover:text-white">
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 ml-56">
        <main className="p-6 max-w-3xl mx-auto"><Outlet /></main>
      </div>
    </div>
  )
}
