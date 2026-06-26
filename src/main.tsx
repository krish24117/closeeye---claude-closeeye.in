import React from 'react'
import ReactDOM from 'react-dom/client'
// Open Sauce One — the only brand typeface (loaded via fontsource @font-face)
import '@fontsource/open-sauce-one/400.css'
import '@fontsource/open-sauce-one/500.css'
import '@fontsource/open-sauce-one/600.css'
import '@fontsource/open-sauce-one/700.css'
import '@fontsource/open-sauce-one/800.css'
import '@fontsource/open-sauce-one/400-italic.css'
import '@fontsource/open-sauce-one/500-italic.css'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
