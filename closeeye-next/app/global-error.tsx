'use client'
import { useEffect } from 'react'
import { reportError } from '@/lib/observability/report'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error])
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#F6F3EC', color: '#0E2A1F', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#5B6B62', maxWidth: 420, margin: '0.75rem auto 1.5rem' }}>Please reload the page. If it keeps happening, reach us on WhatsApp and we’ll help right away.</p>
          <button onClick={reset} style={{ background: '#0E2A1F', color: '#F6F3EC', border: 0, borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
