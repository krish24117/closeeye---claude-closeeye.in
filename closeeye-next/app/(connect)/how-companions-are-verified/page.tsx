import { redirect } from 'next/navigation'

/**
 * /how-companions-are-verified — RETIRED (the last page in the old Connect "paper" styling).
 * Its content lives on /trust-safety: the founder's five exact verification-promise lines and
 * the closing promise were relocated there VERBATIM ("How every Guardian is verified" block).
 */
export default function HowCompanionsAreVerifiedPage() {
  redirect('/trust-safety')
}
