'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
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
 *
 * DISMISSAL (P0-6) — every sheet must be escapable, never a trap that forces an app
 * restart. Five paths, all here so every caller inherits them:
 *   1. Backdrop tap        4. Swipe-down on the grab handle (bottom-sheet)
 *   2. Escape (desktop)    5. A visible close (✕) control
 *   3. Hardware / gesture Back — we push a history entry on open so Back pops the
 *      SHEET, not the app (the actual force-quit cause on Android/iOS).
 * Paths 1–3 apply to EVERY sheet (behavioural, no visual change). Paths 4–5 are the
 * built-in `chrome`; it is opt-IN (default off) because most sheets already render
 * their own header + ✕ — passing `chrome` would double it. Turn it on for sheets that
 * have no close of their own (e.g. the Connect sheet, the network sheet).
 */
export function Overlay({
  open,
  onClose,
  children,
  align = 'end',
  chrome = false,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  align?: 'end' | 'center'
  /** Render the built-in grab handle + close (✕). Opt-in — only for sheets without their own close. */
  chrome?: boolean
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
  const isSheet = align === 'end'
  const dragControls = useDragControls()

  // Stable ref to onClose so the effects below key on `open` ALONE. Keying on onClose (a new
  // closure most renders) would re-run them every render — pushing duplicate history entries.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Escape + body-scroll lock.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // Hardware / gesture Back closes the SHEET, not the app. Push a history entry when the sheet
  // opens; a Back press pops it → popstate → we close. Closing via any UI path pops our own entry
  // (history.back) so we never leave a dangling state — UNLESS a navigation already replaced the
  // top (router.push), in which case history.state is no longer ours and we leave it be.
  useEffect(() => {
    if (!open) return
    window.history.pushState({ ceOverlay: true }, '')
    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.ceOverlay) window.history.back()
    }
  }, [open])

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
          onClick={() => onClose()}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-surface-raised shadow-lg sm:rounded-lg"
            initial={{ y: slide, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: slide, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            drag={isSheet ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
          >
            {chrome && isSheet && (
              // Grab handle — the drag surface. Owning the drag here (dragListener=false + this
              // pointerDown) means the sheet's own content keeps scrolling normally.
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex cursor-grab touch-none select-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
                aria-hidden
              >
                <span className="h-1 w-10 rounded-full bg-edge" />
              </div>
            )}
            {chrome && (
              <button
                type="button"
                onClick={() => onClose()}
                aria-label="Close"
                className="absolute end-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface/80 text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-accent hover:text-content"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
