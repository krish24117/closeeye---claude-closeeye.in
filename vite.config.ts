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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dates':    ['date-fns'],
          'vendor-icons':    ['lucide-react', 'react-icons'],
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
