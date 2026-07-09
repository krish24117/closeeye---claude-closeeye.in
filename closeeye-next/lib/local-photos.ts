/**
 * Device-local family-member photo store. Photos aren't persisted server-side
 * yet (the loved_ones table has no photo column) — this keeps a chosen photo
 * visible on the same device until a `photo_url` column + storage bucket are
 * added. Safe to call anywhere; it no-ops when localStorage is unavailable.
 */
const key = (id: string) => `ce.member.photo.${id}`

export function setLocalPhoto(id: string, dataUrl: string): void {
  try {
    localStorage.setItem(key(id), dataUrl)
  } catch {
    /* quota exceeded or unavailable */
  }
}

export function getLocalPhoto(id: string): string | null {
  try {
    return localStorage.getItem(key(id))
  } catch {
    return null
  }
}
