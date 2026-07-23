import { redirect } from 'next/navigation'

/**
 * The trusted-presence landing is now the single home (`/`) on every door (founder 2026-07-23,
 * single UI). `/nri` is kept as a canonical redirect so existing links keep working.
 */
export default function NriPage() {
  redirect('/')
}
