import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { Badge, Avatar, EmptyState, ErrorBox, Skeleton } from './_shared'

export function AdminReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  useEffect(() => {
    const photoPaths = Array.from(new Set(reports.flatMap(r => (r.photo_urls || []) as string[])))
    const videoPaths = Array.from(new Set(reports.flatMap(r => (r.video_urls || []) as string[])))
    if (photoPaths.length === 0 && videoPaths.length === 0) return

    async function resolve() {
      const map: Record<string, string> = {}
      if (photoPaths.length > 0) {
        const { data, error } = await supabase.storage.from('visit-photos').createSignedUrls(photoPaths, 3600)
        if (error) console.error('Failed to load photo URLs:', error)
        data?.forEach(d => { if (d.signedUrl && d.path) map[`visit-photos:${d.path}`] = d.signedUrl })
      }
      if (videoPaths.length > 0) {
        const { data, error } = await supabase.storage.from('visit-videos').createSignedUrls(videoPaths, 3600)
        if (error) console.error('Failed to load video URLs:', error)
        data?.forEach(d => { if (d.signedUrl && d.path) map[`visit-videos:${d.path}`] = d.signedUrl })
      }
      setSignedUrls(prev => ({ ...prev, ...map }))
    }
    resolve()
  }, [reports])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('visit_reports')
        .select('*, loved_ones(full_name), companions(full_name), bookings(service_type, scheduled_at)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Skeleton h={80} />

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="adm-page-h">Visit Reports</h1>
        <p className="adm-page-sub">All visit reports submitted by companions.</p>
      </div>

      {error && (
        <ErrorBox onRetry={load} />
      )}

      {reports.length === 0 ? (
        <EmptyState title="No reports yet" sub="Reports appear here after each visit is completed" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map(r => (
            <div key={r.id} className="adm-card adm-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--forest)', fontSize: 15 }}>{r.loved_ones?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>by {r.companions?.full_name} · {format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                  {r.bookings?.service_type && (
                    <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{SERVICE_NAMES[r.bookings.service_type] || r.bookings.service_type}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['😊', r.mood_score, 'Mood'], ['💊', r.health_score, 'Health'], ['🏠', r.home_safety_score, 'Safety']].map(([e, s, l]) => s && (
                    <div key={l as string} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 18 }}>{e}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{s}/5</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              {r.family_message && (
                <div style={{ borderLeft: '3px solid var(--forest)', padding: '10px 14px', background: 'var(--cream)', borderRadius: '0 8px 8px 0', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--forest-2)', fontStyle: 'italic' }}>"{r.family_message}"</p>
                </div>
              )}
              {r.medication_taken !== null && (
                <div style={{ marginBottom: 4 }}>
                  <Badge tone={r.medication_taken ? 'green' : 'red'}>
                    Medication {r.medication_taken ? 'taken ✓' : 'not taken ✗'}
                  </Badge>
                </div>
              )}
              {r.photo_urls?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {r.photo_urls.map((path: string, i: number) => {
                    const url = signedUrls[`visit-photos:${path}`]
                    return url
                      ? <img key={i} src={url} alt="Visit photo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                      : <div key={i} style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--gray-light)' }} />
                  })}
                </div>
              )}
              {r.video_urls?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {r.video_urls.map((path: string, i: number) => {
                    const url = signedUrls[`visit-videos:${path}`]
                    return url
                      ? <video key={i} src={url} controls style={{ width: 128, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)', background: '#000' }} />
                      : <div key={i} style={{ width: 128, height: 80, borderRadius: 8, background: 'var(--gray-light)' }} />
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
