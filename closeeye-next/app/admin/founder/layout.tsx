'use client'

/**
 * The Founder Workspace — CloseEye's executive operating system. Four focused surfaces (Today /
 * Growth / Operations / Intelligence) under one calm, editorial chrome. It sits INSIDE the admin
 * StaffGuard + AdminShell (so the Operations rail persists); this layout only adds the workspace
 * tab bar. It answers one question — "How is CloseEye doing today?" — and must never feel like an
 * admin console.
 */
import { FounderTabs } from '@/components/admin/founder-workspace'

export default function FounderWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <FounderTabs />
      {children}
    </div>
  )
}
