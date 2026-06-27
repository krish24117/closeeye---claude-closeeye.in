import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createRequire } from 'node:module'

// vite-plugin-prerender's ESM build incorrectly uses require() — load the CJS build instead
const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vitePrerender = _require('vite-plugin-prerender') as any

const PUBLIC_ROUTES = [
  '/', '/services', '/about', '/faq', '/contact', '/waitlist',
  '/for-societies', '/companions', '/join-as-companion',
  '/privacy-policy', '/terms', '/refund-policy',
]

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === 'build' && vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: PUBLIC_ROUTES,
      renderer: new vitePrerender.PuppeteerRenderer({
        renderAfterTime: 2000,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Puppeteer v1.x doesn't reliably install Chromium on Windows; use system Chrome
        ...(process.platform === 'win32' && {
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        }),
      }),
    }),
  ],
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
        },
      },
    },
  },
  // @react-pdf/renderer uses CJS internals that confuse Vite's pre-bundler
  optimizeDeps: {
    exclude: ['@react-pdf/renderer'],
  },
}))
