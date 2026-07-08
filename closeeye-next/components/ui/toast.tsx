'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info } from 'lucide-react'

type Tone = 'success' | 'info'
interface Toast {
  id: number
  message: string
  tone: Tone
}

const ToastContext = React.createContext<((message: string, tone?: Tone) => void) | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const nextId = React.useRef(0)

  const toast = React.useCallback((message: string, tone: Tone = 'success') => {
    const id = ++nextId.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-lg"
              role="status"
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.tone === 'success' ? 'bg-success/12 text-success' : 'bg-accent-soft text-green'}`}>
                {t.tone === 'success' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Info className="h-3.5 w-3.5" strokeWidth={2} />}
              </span>
              <p className="text-body-sm text-ink">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
