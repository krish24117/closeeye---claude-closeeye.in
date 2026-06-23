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
  },
  // @react-pdf/renderer uses CJS internals that confuse Vite's pre-bundler
  optimizeDeps: {
    exclude: ['@react-pdf/renderer'],
  },
})
