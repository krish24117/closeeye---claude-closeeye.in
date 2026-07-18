import type { Metadata } from 'next'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'

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
  return <WorkspaceShell>{children}</WorkspaceShell>
}
