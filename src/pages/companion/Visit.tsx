import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  Camera, Video, X, MapPin, CheckCircle2, Clock,
  Loader2, AlertTriangle, FileText, ArrowLeft,
} from 'lucide-react'
import type { VisitPdfData } from '@/lib/visitPdf'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS    = 6
const MAX_PHOTO_MB  = 5
const MAX_VIDEOS    = 2
const MAX_VIDEO_MB  = 50

// ─── GPS helper ───────────────────────────────────────────────────────────────

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      p  => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, enableHighAccuracy: true },
    )
  })
}

// ─── PDF generation + upload (dynamically imported) ──────────────────────────

async function buildAndUploadPDF(
  data: VisitPdfData,
  bookingId: string,
): Promise<string | null> {
  try {
    // Lazy-load to keep initial bundle light & avoid Vite pre-bundle issues
    const { pdf }             = await import('@react-pdf/renderer')
    const { VisitReportPDF }  = await import('@/lib/visitPdf')

    // Cast needed: pdf() expects DocumentProps but we're constructing via dynamic import
    const element = React.createElement(VisitReportPDF, { data }) as any
    const blob = await pdf(element).toBlob()

    const path = `${bookingId}/${Date.now()}-report.pdf`
    const { error: upErr } = await supabase.storage
      .from('visit-pdfs')
      .upload(path, blob, { contentType: 'application/pdf' })

    if (upErr) { console.error('PDF upload:', upErr); return null }

    const { data: signed, error: signErr } = await supabase.storage
      .from('visit-pdfs')
      .createSignedUrl(path, 60 * 60 * 24 * 7) // 7-day link

    if (signErr) { console.error('Signed URL:', signErr); return null }
    return signed.signedUrl
  } catch (err) {
    console.error('PDF generation failed:', err)
    return null
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GpsCapture({
  gps,
  loading,
  error,
  onCapture,
}: {
  gps: { lat: number; lng: number } | null
  loading: boolean
  error: string
  onCapture: () => void
}) {
  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
      <MapPin size={18} className={`mt-0.5 flex-shrink-0 ${gps ? 'text-green-600' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        {gps ? (
          <>
            <p className="text-xs font-semibold text-green-700 mb-0.5">GPS captured</p>
            <p className="text-xs text-gray-500 font-mono truncate">
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-600 mb-0.5">
              {loading ? 'Capturing location…' : 'Location not yet captured'}
            </p>
            {error && <p className="text-xs text-amber-600">{error}</p>}
          </>
        )}
      </div>
      {!gps && (
        <button
          type="button"
          onClick={onCapture}
          disabled={loading}
          className="text-xs font-semibold text-green-700 hover:text-green-900 disabled:text-gray-400 transition-colors whitespace-nowrap"
        >
          {loading ? 'Capturing…' : 'Capture GPS'}
        </button>
      )}
    </div>
  )
}

function PhotoPicker({
  label,
  hint,
  photos,
  onAdd,
  onRemove,
  max,
  error,
  single = false,
}: {
  label: string
  hint?: string
  photos: { file: File; url: string }[]
  onAdd: (files: FileList) => void
  onRemove: (i: number) => void
  max: number
  error: string
  single?: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-green-900">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div key={p.url} className="relative w-20 h-20">
              <img src={p.url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-600 shadow-sm"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length < max && (
        <label className="inline-flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 cursor-pointer hover:border-green-300 hover:text-green-700 transition-colors">
          <Camera size={16} />
          {photos.length === 0 ? 'Add photo' : 'Add more'}
          <input
            type="file"
            accept="image/*"
            multiple={!single}
            capture="environment"
            className="sr-only"
            onChange={e => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = '' }}
          />
        </label>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

type PdfStep = 'idle' | 'generating' | 'sending' | 'done'

function PdfProgress({ step }: { step: PdfStep }) {
  if (step === 'idle') return null

  const steps: { id: PdfStep; label: string }[] = [
    { id: 'generating', label: 'Generating PDF report…' },
    { id: 'sending',    label: 'Sending WhatsApp to family…' },
    { id: 'done',       label: 'Report delivered!' },
  ]

  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-2">
      {steps.map(s => {
        const idx   = steps.findIndex(x => x.id === step)
        const cur   = steps.findIndex(x => x.id === s.id)
        const done  = cur < idx || step === 'done'
        const active= s.id === step && step !== 'done'
        return (
          <div key={s.id} className="flex items-center gap-2.5">
            {done ? (
              <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
            ) : active ? (
              <Loader2 size={15} className="text-green-600 animate-spin flex-shrink-0" />
            ) : (
              <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-200 flex-shrink-0" />
            )}
            <span className={`text-xs ${done || active ? 'text-green-800 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step progress indicator ──────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      <span className={`flex items-center gap-1.5 ${current === 1 ? 'text-green-700' : 'text-green-500'}`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${current === 1 ? 'bg-green-800 text-white' : 'bg-green-100 text-green-600'}`}>
          {current > 1 ? '✓' : '1'}
        </span>
        Check In
      </span>
      <span className="text-gray-200">—</span>
      <span className={`flex items-center gap-1.5 ${current === 2 ? 'text-green-700' : 'text-gray-300'}`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${current === 2 ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
          2
        </span>
        Report
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompanionVisit() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { user }      = useAuth()
  const navigate      = useNavigate()

  // ── Booking ──────────────────────────────────────────────────────────
  const [booking,   setBooking]   = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── GPS ──────────────────────────────────────────────────────────────
  const [gps,       setGps]       = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading,setGpsLoading]= useState(false)
  const [gpsError,  setGpsError]  = useState('')

  // ── Check-in ─────────────────────────────────────────────────────────
  const [ciPhotos,  setCiPhotos]  = useState<{ file: File; url: string }[]>([])
  const [ciPhotoErr,setCiPhotoErr]= useState('')
  const [checkingIn,setCheckingIn]= useState(false)
  const [ciError,   setCiError]   = useState('')

  // ── Report form ──────────────────────────────────────────────────────
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [photos,    setPhotos]    = useState<{ file: File; url: string }[]>([])
  const [photoErr,  setPhotoErr]  = useState('')
  const [videos,    setVideos]    = useState<{ file: File; url: string }[]>([])
  const [videoErr,  setVideoErr]  = useState('')

  // ── Submit state ─────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pdfStep,   setPdfStep]   = useState<PdfStep>('idle')

  // ── Load booking ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user || !bookingId) return
    setLoading(true); setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, loved_ones(*)')
        .eq('id', bookingId)
        .eq('companion_id', user.id)
        .single()
      if (error) throw error
      setBooking(data)
    } catch {
      setLoadError('Could not load visit — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, bookingId])

  useEffect(() => { load() }, [load])

  // ── GPS capture ──────────────────────────────────────────────────────
  const captureGPS = useCallback(async () => {
    setGpsLoading(true); setGpsError('')
    const coords = await getGPS()
    if (coords) {
      setGps(coords)
    } else {
      setGpsError('Could not get location. GPS will be skipped — you can still check in.')
    }
    setGpsLoading(false)
    return coords
  }, [])

  // Auto-capture GPS when check-in screen appears
  useEffect(() => {
    if (booking && !booking.checked_in_at && !gps) captureGPS()
  }, [booking]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo handlers (check-in) ────────────────────────────────────────
  function addCiPhoto(files: FileList) {
    setCiPhotoErr('')
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { setCiPhotoErr('Images only.'); continue }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) { setCiPhotoErr(`Max ${MAX_PHOTO_MB} MB.`); continue }
      setCiPhotos(prev => prev.length < 1 ? [{ file: f, url: URL.createObjectURL(f) }] : prev)
    }
  }
  function removeCiPhoto(i: number) {
    setCiPhotos(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i) })
  }

  // ── Photo handlers (visit) ───────────────────────────────────────────
  function addPhoto(files: FileList) {
    setPhotoErr('')
    const valid: typeof photos = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { setPhotoErr('Images only.'); continue }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoErr(`Max ${MAX_PHOTO_MB} MB each.`); continue }
      valid.push({ file: f, url: URL.createObjectURL(f) })
    }
    setPhotos(prev => {
      const next = [...prev, ...valid].slice(0, MAX_PHOTOS)
      if (prev.length + valid.length > MAX_PHOTOS) setPhotoErr(`Max ${MAX_PHOTOS} photos.`)
      return next
    })
  }
  function removePhoto(i: number) {
    setPhotos(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i) })
  }

  // ── Video handlers ───────────────────────────────────────────────────
  function addVideo(files: FileList) {
    setVideoErr('')
    const valid: typeof videos = []
    for (const f of Array.from(files)) {
      if (f.type !== 'video/mp4' && f.type !== 'video/quicktime') { setVideoErr('MP4 or MOV only.'); continue }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) { setVideoErr(`Max ${MAX_VIDEO_MB} MB each.`); continue }
      valid.push({ file: f, url: URL.createObjectURL(f) })
    }
    setVideos(prev => {
      const next = [...prev, ...valid].slice(0, MAX_VIDEOS)
      if (prev.length + valid.length > MAX_VIDEOS) setVideoErr(`Max ${MAX_VIDEOS} videos.`)
      return next
    })
  }
  function removeVideo(i: number) {
    setVideos(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i) })
  }

  // ────────────────────────────────────────────────────────────────────
  // CHECK-IN submit
  // ────────────────────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!booking || !user) return
    setCheckingIn(true); setCiError('')

    // Re-capture GPS if not yet captured
    let coords = gps
    if (!coords) coords = await captureGPS()

    // Upload arrival photo (optional)
    let ciPhotoPath: string | null = null
    if (ciPhotos[0]) {
      const { file } = ciPhotos[0]
      const path = `${booking.id}/checkin-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('visit-photos').upload(path, file)
      if (error) {
        setCiError(`Photo upload failed: ${error.message}`)
        setCheckingIn(false)
        return
      }
      ciPhotoPath = path
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        checked_in_at:     new Date().toISOString(),
        check_in_lat:      coords?.lat ?? null,
        check_in_lng:      coords?.lng ?? null,
        check_in_photo_path: ciPhotoPath,
        status:            'in_progress',
      })
      .eq('id', booking.id)

    if (error) { setCiError(error.message); setCheckingIn(false); return }

    window.dispatchEvent(new Event('closeeye:active-booking-changed'))
    await load()   // reload to switch to Phase 2
    setCheckingIn(false)
  }

  // ────────────────────────────────────────────────────────────────────
  // REPORT + CHECK-OUT submit
  // ────────────────────────────────────────────────────────────────────
  const onSubmit = async (formData: any) => {
    if (!booking || !user) return
    setSaving(true); setSaveError(''); setPdfStep('idle')

    // 1. Auto-capture check-out GPS
    const checkOutGps = await getGPS()

    // 2. Upload visit photos (include check-in photo if exists)
    const photoPaths: string[] = []
    if (booking.check_in_photo_path) photoPaths.push(booking.check_in_photo_path)
    for (const { file } of photos) {
      const path = `${booking.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('visit-photos').upload(path, file)
      if (error) { setSaveError(`Photo upload failed: ${error.message}`); setSaving(false); return }
      photoPaths.push(path)
    }

    // 3. Upload videos
    const videoPaths: string[] = []
    for (const { file } of videos) {
      const path = `${booking.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('visit-videos').upload(path, file)
      if (error) { setSaveError(`Video upload failed: ${error.message}`); setSaving(false); return }
      videoPaths.push(path)
    }

    // 4. Update booking — check-out + completed
    const checkOutAt = new Date().toISOString()
    const { error: boErr } = await supabase
      .from('bookings')
      .update({
        checked_out_at: checkOutAt,
        check_out_lat:  checkOutGps?.lat ?? null,
        check_out_lng:  checkOutGps?.lng ?? null,
        status:         'completed',
        completed_at:   checkOutAt,
      })
      .eq('id', booking.id)

    if (boErr) { setSaveError(`Booking update failed: ${boErr.message}`); setSaving(false); return }

    // 5. Insert visit report
    const { data: report, error: repErr } = await supabase
      .from('visit_reports')
      .insert({
        booking_id:            booking.id,
        companion_id:          user.id,
        loved_one_id:          booking.loved_one_id,
        mood_score:            parseInt(formData.mood_score),
        health_score:          parseInt(formData.health_score),
        home_safety_score:     parseInt(formData.home_safety_score),
        mood_notes:            formData.mood_notes   || null,
        health_notes:          formData.health_notes || null,
        medication_taken:      formData.medication_taken === 'true',
        medication_notes:      formData.medication_notes || null,
        home_safety_notes:     formData.home_safety_notes || null,
        activity_during_visit: formData.activity_during_visit || null,
        family_message:        formData.family_message,
        follow_up_needed:      formData.follow_up_needed === 'true',
        follow_up_notes:       formData.follow_up_notes || null,
        visit_started_at:      booking.checked_in_at,
        visit_ended_at:        checkOutAt,
        photo_urls:            photoPaths,
        video_urls:            videoPaths,
      })
      .select('id')
      .single()

    if (repErr) { setSaveError(repErr.message); setSaving(false); return }

    // 6. Generate PDF ─────────────────────────────────────────────────
    setPdfStep('generating')

    // Companion name
    const { data: companion } = await supabase
      .from('companions')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Signed URLs for photos so @react-pdf/renderer can embed them
    const signedPhotoUrls: string[] = []
    for (const path of photoPaths) {
      const { data: su } = await supabase.storage
        .from('visit-photos')
        .createSignedUrl(path, 3600)
      if (su?.signedUrl) signedPhotoUrls.push(su.signedUrl)
    }

    const pdfData: VisitPdfData = {
      companionName:      companion?.full_name ?? 'Companion',
      lovedOneName:       booking.loved_ones?.full_name ?? '',
      lovedOneCity:       booking.loved_ones?.city ?? '',
      checkInAt:          booking.checked_in_at!,
      checkOutAt,
      checkInLat:         booking.check_in_lat  ?? null,
      checkInLng:         booking.check_in_lng  ?? null,
      checkOutLat:        checkOutGps?.lat ?? null,
      checkOutLng:        checkOutGps?.lng ?? null,
      moodScore:          parseInt(formData.mood_score),
      healthScore:        parseInt(formData.health_score),
      homeSafetyScore:    parseInt(formData.home_safety_score),
      medicationTaken:    formData.medication_taken === 'true',
      medicationNotes:    formData.medication_notes   ?? '',
      moodNotes:          formData.mood_notes         ?? '',
      healthNotes:        formData.health_notes       ?? '',
      homeSafetyNotes:    formData.home_safety_notes  ?? '',
      activityDuringVisit:formData.activity_during_visit ?? '',
      familyMessage:      formData.family_message,
      followUpNeeded:     formData.follow_up_needed === 'true',
      followUpNotes:      formData.follow_up_notes    ?? '',
      photoUrls:          signedPhotoUrls,
      generatedAt:        new Date().toISOString(),
    }

    const pdfUrl = await buildAndUploadPDF(pdfData, booking.id)

    if (pdfUrl && report?.id) {
      // Save PDF URL on the report
      await supabase.from('visit_reports').update({ pdf_url: pdfUrl }).eq('id', report.id)

      // 7. Send WhatsApp via Edge Function ──────────────────────────────
      setPdfStep('sending')
      try {
        await supabase.functions.invoke('send-visit-whatsapp', {
          body: { booking_id: booking.id, pdf_url: pdfUrl },
        })
      } catch (e) {
        // Non-fatal: visit is already saved, WhatsApp is best-effort
        console.warn('WhatsApp send failed (non-fatal):', e)
      }
    }

    setPdfStep('done')
    window.dispatchEvent(new Event('closeeye:active-booking-changed'))
    navigate('/companion')
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const ScoreField = ({ name, label }: { name: string; label: string }) => (
    <div>
      <label className="block text-sm font-semibold text-green-900 mb-2">{label} (1–5) *</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <label key={n} className="flex-1">
            <input type="radio" value={n} {...register(name, { required: true })} className="sr-only peer" />
            <div className="text-center py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 hover:border-green-300 transition-colors">
              {n}
            </div>
          </label>
        ))}
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">Required</p>}
    </div>
  )

  // ─── Loading / error states ───────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-24" />
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="h-4 bg-gray-100 rounded w-36" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-12 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-32" />
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )

  if (loadError) return (
    <div className="text-center py-20">
      <p className="text-red-600 font-semibold mb-2">{loadError}</p>
      <button onClick={load} className="text-sm text-green-700 font-medium underline">Retry</button>
    </div>
  )

  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-green-900 font-semibold mb-1">Visit not found</p>
      <p className="text-gray-400 text-sm mb-4">This visit doesn't exist or isn't assigned to you.</p>
      <button onClick={() => navigate('/companion')} className="flex items-center gap-1.5 text-sm text-green-700 font-medium mx-auto">
        <ArrowLeft size={15} /> Back
      </button>
    </div>
  )

  const phase: 'checkin' | 'report' = booking.checked_in_at ? 'report' : 'checkin'

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — CHECK-IN
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'checkin') return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Nav + step indicator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/companion')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <StepIndicator current={1} />
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className="text-green-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">Check In</p>
        </div>
        <p className="font-serif text-xl text-green-900 mb-0.5">{booking.loved_ones?.full_name}</p>
        <p className="text-sm text-gray-400">{booking.loved_ones?.city}</p>
        {booking.scheduled_at && (
          <p className="text-xs text-green-600 font-semibold mt-2">
            Scheduled {new Date(booking.scheduled_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'medium' })}
          </p>
        )}
      </div>

      {/* Booking notes for companion */}
      {booking.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Instructions from the family</p>
          <p className="text-sm text-amber-900 leading-relaxed">{booking.notes}</p>
        </div>
      )}

      {/* GPS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold text-green-900 text-sm">Your location</h2>
        <GpsCapture
          gps={gps}
          loading={gpsLoading}
          error={gpsError}
          onCapture={captureGPS}
        />
        <p className="text-xs text-gray-400">
          GPS is recorded at check-in to verify the visit location. You can still check in without GPS.
        </p>
      </div>

      {/* Arrival photo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
        <h2 className="font-semibold text-green-900 text-sm mb-3">Arrival photo</h2>
        <PhotoPicker
          label="Take a photo on arrival"
          hint="Helps confirm you've arrived. Optional but recommended."
          photos={ciPhotos}
          onAdd={addCiPhoto}
          onRemove={removeCiPhoto}
          max={1}
          error={ciPhotoErr}
          single
        />
      </div>

      {/* Timestamp preview */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-green-800">Check-in timestamp</p>
          <p className="text-xs text-gray-500">
            Will be recorded as: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      {ciError && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{ciError}</p>
        </div>
      )}

      <button
        onClick={handleCheckIn}
        disabled={checkingIn}
        className="w-full bg-green-800 text-white font-semibold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
      >
        {checkingIn ? <><Loader2 size={16} className="animate-spin" /> Checking in…</> : 'Confirm Check-In →'}
      </button>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — VISIT REPORT + CHECK-OUT
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Nav + step indicator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/companion')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <StepIndicator current={2} />
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-green-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">Visit Report</p>
        </div>
        <p className="font-serif text-xl text-green-900 mb-0.5">{booking.loved_ones?.full_name}</p>
        <p className="text-sm text-gray-400">{booking.loved_ones?.city}</p>
      </div>

      {/* Check-in summary strip */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 flex items-center gap-3">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-800">Checked in</p>
          <p className="text-xs text-gray-500">
            {new Date(booking.checked_in_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            {booking.check_in_lat != null && (
              <span className="ml-2 font-mono">· {booking.check_in_lat.toFixed(4)}, {booking.check_in_lng.toFixed(4)}</span>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Wellbeing scores ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Wellbeing assessment</h2>
          <ScoreField name="mood_score"        label="Mood & emotional state" />
          <ScoreField name="health_score"      label="Physical health" />
          <ScoreField name="home_safety_score" label="Home & safety" />
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Mood notes</label>
            <textarea {...register('mood_notes')} rows={2} placeholder="Energy, mood, spirits…" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Health notes</label>
            <textarea {...register('health_notes')} rows={2} placeholder="Any complaints, symptoms, concerns…" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
        </div>

        {/* ── Medication ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Medication</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-2">Was medication taken? *</label>
            <div className="flex gap-3">
              {[['true', 'Yes ✓'], ['false', 'No ✗']].map(([v, l]) => (
                <label key={v} className="flex-1">
                  <input type="radio" value={v} {...register('medication_taken', { required: true })} className="sr-only peer" />
                  <div className="text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{l}</div>
                </label>
              ))}
            </div>
            {errors.medication_taken && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Medication notes</label>
            <input {...register('medication_notes')} placeholder="Which medications, any concerns?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
          </div>
        </div>

        {/* ── Activity & home ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Activity & home</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">What did you do during the visit?</label>
            <textarea {...register('activity_during_visit')} rows={2} placeholder="Had tea, watched TV, helped with lunch…" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Home & safety notes</label>
            <textarea {...register('home_safety_notes')} rows={2} placeholder="Cleanliness, hazards, appliances…" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
        </div>

        {/* ── Visit photos ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-green-900 mb-3">Photos</h2>
          <PhotoPicker
            label={`Add up to ${MAX_PHOTOS} photos from the visit`}
            hint="These are shared with the family in the report."
            photos={photos}
            onAdd={addPhoto}
            onRemove={removePhoto}
            max={MAX_PHOTOS}
            error={photoErr}
          />
        </div>

        {/* ── Visit videos ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-3">
          <h2 className="font-semibold text-green-900">Videos</h2>
          <p className="text-xs text-gray-400">Up to {MAX_VIDEOS} videos (MP4 or MOV, max {MAX_VIDEO_MB} MB each).</p>
          {videos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {videos.map((v, i) => (
                <div key={v.url} className="relative w-28 h-20">
                  <video src={v.url} muted className="w-28 h-20 object-cover rounded-xl border border-gray-100 bg-black" />
                  <button type="button" onClick={() => removeVideo(i)} className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-600 shadow-sm">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {videos.length < MAX_VIDEOS && (
            <label className="inline-flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 cursor-pointer hover:border-green-300 hover:text-green-700 transition-colors">
              <Video size={16} /> Add video
              <input type="file" accept="video/mp4,video/quicktime" multiple capture="environment" className="sr-only"
                onChange={e => { if (e.target.files?.length) addVideo(e.target.files); e.target.value = '' }} />
            </label>
          )}
          {videoErr && <p className="text-red-500 text-xs">{videoErr}</p>}
        </div>

        {/* ── Message for the family ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Message for the family</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Warm message to share *</label>
            <textarea {...register('family_message', { required: true })} rows={3}
              placeholder="Had a lovely visit with aunty. She's in good spirits and…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
            {errors.family_message && <p className="text-red-500 text-xs mt-1">Required — the family sees this first.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-2">Follow-up needed?</label>
            <div className="flex gap-3">
              {[['false', 'No'], ['true', 'Yes']].map(([v, l]) => (
                <label key={v} className="flex-1">
                  <input type="radio" value={v} {...register('follow_up_needed')} defaultChecked={v === 'false'} className="sr-only peer" />
                  <div className="text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{l}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Follow-up notes</label>
            <input {...register('follow_up_notes')} placeholder="If yes, what needs attention?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
          </div>
        </div>

        {/* ── Check-out info ────────────────────────────────────────── */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-green-600" />
            <p className="text-xs font-semibold text-green-800">Check-out on submit</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            When you tap <strong>Complete Visit</strong>, your GPS location and timestamp will be
            recorded as the check-out, and a PDF report will be generated and sent to the family
            via WhatsApp.
          </p>
        </div>

        {/* PDF progress */}
        <PdfProgress step={pdfStep} />

        {saveError && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm">{saveError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-800 text-white font-semibold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> {pdfStep === 'generating' ? 'Generating PDF…' : pdfStep === 'sending' ? 'Sending to family…' : 'Completing visit…'}</>
            : 'Complete Visit & Send Report →'}
        </button>

      </form>
    </div>
  )
}
