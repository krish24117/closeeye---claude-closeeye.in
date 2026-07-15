import { ConnectExperience } from './experience'

/**
 * /connect — the Close Eye Connect experience (the launch product). A thin server
 * shell; the staged, deterministic experience is the client component. All logic
 * lives in the Understanding Engine (lib/connect) + the Space data layer
 * (lib/db/space). This route touches nothing outside app/(connect) + app/(space).
 */
export default function ConnectPage() {
  return <ConnectExperience />
}
