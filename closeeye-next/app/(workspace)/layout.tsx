import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import '@/styles/workspace.css'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'

// Connect's design language: Newsreader serif = the human voice; Inter (from the root layout)
// = interface chrome. Scoped to .wsp so the rest of the site is untouched.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

/**
 * Phase 2, Sprint 1 — the canonical Workspace routes (/space/*) live here, under the ONE
 * Workspace shell. Kept in its own route group so it does NOT inherit the (space) island's
 * scoped Connect styling, and so /space (the existing home) stays untouched until Sprint 2
 * migrates it in. Private, never indexed.
 */
export const metadata: Metadata = {
  title: { absolute: 'Close Eye — Workspace' },
  robots: { index: false, follow: false },
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wsp ${newsreader.variable}`}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </div>
  )
}
