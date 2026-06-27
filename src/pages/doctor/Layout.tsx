import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/ui/Logo'

export function DoctorLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [doctorName, setDoctorName] = useState<string>('')
  const [specialisation, setSpecialisation] = useState<string>('')

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()
      if (!active) return
      setDoctorName(data?.name || profile.full_name || 'Doctor')
      setSpecialisation(data?.specialisation || '')
    })()
    return () => {
      active = false
    }
  }, [profile?.id, profile?.full_name])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <header
        style={{
          background: '#fff',
          height: 60,
          padding: '0 24px',
          borderBottom: '0.5px solid var(--gray-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo className="w-7 h-7" />
          <span style={{ fontSize: 14, color: 'var(--gray-mid)' }}>Doctor Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>
            Dr. {doctorName}
          </span>
          {specialisation && (
            <span
              style={{
                background: 'var(--sage)',
                color: 'var(--forest)',
                borderRadius: 100,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {specialisation}
            </span>
          )}
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-mid)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
        <Outlet />
      </main>
    </div>
  )
}
