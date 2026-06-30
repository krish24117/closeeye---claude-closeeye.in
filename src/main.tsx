import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
// Open Sauce One — the only brand typeface (loaded via fontsource @font-face)
import '@fontsource/open-sauce-one/400.css'
import '@fontsource/open-sauce-one/500.css'
import '@fontsource/open-sauce-one/600.css'
import '@fontsource/open-sauce-one/700.css'
import '@fontsource/open-sauce-one/800.css'
import '@fontsource/open-sauce-one/400-italic.css'
// 500-italic removed — not referenced in any CSS rule
import App from './App.tsx'
import './index.css'
import './admin.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
)
