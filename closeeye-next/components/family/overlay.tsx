'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Reusable modal/sheet: bottom-sheet on mobile, centred dialog on desktop.
 *
 * Rendered through a portal to `document.body` so its `position: fixed` layer
 * always resolves against the viewport — never a trapped ancestor. A `transform`,
 * `filter`, or `backdrop-filter` on any parent (e.g. the frosted admin/console
 * headers' `backdrop-blur-xl`) otherwise becomes the containing block for fixed
 * descendants, which would pin and clip this modal inside that header instead of
 * centring it on screen. The portal is the root-cause fix, not a per-header patch.
 */
export function Overlay({
  open,
  onClose,
  children,
  align = 'end',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  align?: 'end' | 'center'
}) {
  // Portal target (document.body) only exists on the client — gate on mount so
  // this is SSR-safe. The overlay is closed at mount, so no animation is lost.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Ch.4 Motion · Law 4 — reduced-motion is complete, JS included. Framer is WAAPI-driven, so the
  // global CSS reduced-motion rule does NOT stop it; honour it here so the sheet fades without
  // sliding (opacity only, no travel) for users who ask for less motion.
  const reduce = useReducedMotion()
  const slide = reduce ? 0 : 24

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex bg-surface-inverse/40 backdrop-blur-sm',
            align === 'center' ? 'items-center justify-center p-4' : 'items-end justify-center p-0 sm:items-center sm:p-6',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-surface-raised shadow-lg sm:rounded-lg"
            initial={{ y: slide, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: slide, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
