import { redirect } from 'next/navigation'

/**
 * /connect — RETIRED as a standalone door (single-UI, founder 2026-07-23/24: one front door,
 * no second homepage). The old Family-Intelligence landing kept leaking into journeys (e.g.
 * after sign-out), contradicting the Trusted-Presence narrative. The canonical home is /;
 * the signed-in Ask engine lives at /space/connect. ConnectHome + the interactive experience
 * remain in the codebase (components/connect/*, ./experience.tsx) — restore is a founder call.
 */
export default function ConnectPage() {
  redirect('/')
}
