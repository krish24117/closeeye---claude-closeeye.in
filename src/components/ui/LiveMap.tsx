import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

export const MAPS_LIBRARIES: ('places')[] = ['places']
export const MAPS_SCRIPT_ID = 'closeeye-google-map-script'
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

export interface LiveMapMarker {
  id: string
  lat: number
  lng: number
  label?: string
}

interface LiveMapProps {
  markers: LiveMapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
}

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 }

function MapPlaceholder({ height, message }: { height: string; message: string }) {
  return (
    <div
      className="bg-gray-100 rounded-2xl flex items-center justify-center text-sm text-gray-400 text-center px-4"
      style={{ height }}
    >
      {message}
    </div>
  )
}

export function LiveMap({ markers, center, zoom = 14, height = '300px' }: LiveMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY || '',
    id: MAPS_SCRIPT_ID,
    libraries: MAPS_LIBRARIES,
  })

  if (!MAPS_KEY) {
    return <MapPlaceholder height={height} message="Map unavailable — Google Maps is not configured." />
  }

  if (loadError) {
    return <MapPlaceholder height={height} message="Map failed to load." />
  }

  if (!isLoaded) {
    return <div className="bg-gray-100 rounded-2xl animate-pulse" style={{ height }} />
  }

  const mapCenter = center || markers[0] || INDIA_CENTER

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height, borderRadius: '16px' }}
      center={mapCenter}
      zoom={zoom}
    >
      {markers.map(m => (
        <Marker key={m.id} position={{ lat: m.lat, lng: m.lng }} label={m.label ? m.label[0] : undefined} title={m.label} />
      ))}
    </GoogleMap>
  )
}
