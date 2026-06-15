import { useEffect, useRef, useState } from 'react'

interface Position {
  lat: number
  lng: number
}

// Watches the device's location while `active` is true, calling
// `onUpdate` at most once every `intervalMs`. GPS failures never throw -
// they surface via the returned `error` string so the caller can show a
// non-blocking notice without interrupting the rest of the page.
export function useGeolocation(active: boolean, onUpdate: (pos: Position) => void, intervalMs = 12000) {
  const [error, setError] = useState<string | null>(null)
  const lastUpdateRef = useRef(0)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!active) return

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device.')
      return
    }

    setError(null)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastUpdateRef.current < intervalMs) return
        lastUpdateRef.current = now
        onUpdateRef.current({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location sharing is off — enable location access to share your live position with the family during this visit.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Your location is currently unavailable.')
        } else {
          setError('Could not get your location — retrying...')
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [active, intervalMs])

  return { error }
}

// One-shot location capture for GPS check-in/check-out. Never rejects -
// resolves null on any error or if geolocation is unsupported, so
// check-in/out can always proceed even without a location fix.
export function getCurrentPosition(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  })
}
