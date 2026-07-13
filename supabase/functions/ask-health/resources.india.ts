// CloseEye Connect · India resource pack.
//
// The ONLY pack for the August launch. Crisis numbers live HERE (configuration), never inside
// the Safety Engine. Future countries add their own pack; the engine and router do not change.
//
// TODO(policy): confirm CloseEye's preferred crisis partners before launch. The defaults below
// are the recognised national lines; the founder may swap any for a partner organisation.

import type { ResourcePack } from './resource-router.ts'

export const INDIA_RESOURCE_PACK: ResourcePack = {
  region: 'IN',
  emergency: { label: 'Ambulance (108)', number: '108', note: 'Government emergency medical services' },
  helplines: {
    mental_health_crisis: [
      { label: 'Tele-MANAS', number: '14416', note: '24/7 national mental-health helpline' },
      // TODO(policy): add/confirm a preferred partner (e.g. iCall, Vandrevala) if desired.
    ],
    safeguarding_child: [
      { label: 'Childline', number: '1098', note: '24/7 national child helpline' },
    ],
    safeguarding_adult: [
      { label: 'Women Helpline', number: '181', note: 'National women’s helpline' },
      // TODO(policy): add a dedicated elder-abuse line if CloseEye wants one.
    ],
  },
  // Empty number by design — the caller falls back to CARE_TEAM_PHONE / the Presence Manager.
  humanFallback: { label: 'CloseEye care team', number: '', note: 'Resolved at runtime from config' },
}
