import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  // Broaden mobile-browser support (older iOS Safari / Android WebView)
  build: {
    target: 'es2015',
    // vendor-pdf (@react-pdf/renderer, ~1.4 MB) is loaded via dynamic import()
    // only when a companion/admin generates a PDF — never on the family dashboard
    // critical path. The warning threshold is raised to suppress the false alarm.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dates':    ['date-fns'],
          'vendor-icons':    ['lucide-react'],
          'vendor-forms':    ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-md':       ['react-markdown'],
          'vendor-pdf':      ['@react-pdf/renderer'],
          'vendor-maps':     ['@react-google-maps/api'],
        },
      },
    },
  },
  // @react-pdf/renderer uses CJS internals that confuse Vite's pre-bundler
  optimizeDeps: {
    exclude: ['@react-pdf/renderer'],
  },
})
