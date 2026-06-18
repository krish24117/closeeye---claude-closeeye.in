import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const DEFAULT_TITLE = "Close Eye — When you can't be there, Close Eye can."
const TAGLINE = 'Verified wellbeing visits for your loved ones in India'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || DEFAULT_TITLE

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0E2A1F',
          backgroundImage: 'linear-gradient(135deg, #0E2A1F 0%, #1a3a2a 50%, #1f4a32 100%)',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#4a9b6a',
              fontSize: 32,
              fontWeight: 700,
              color: '#0E2A1F',
            }}
          >
            CE
          </div>
          <div style={{ display: 'flex', fontSize: 48, fontWeight: 600 }}>
            <div style={{ color: 'white' }}>close&nbsp;</div>
            <div style={{ color: '#6db98a' }}>eye</div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 44,
            color: 'white',
            textAlign: 'center',
            maxWidth: 920,
            lineHeight: 1.3,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#a8d5b8', marginTop: 28 }}>
          {TAGLINE}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
