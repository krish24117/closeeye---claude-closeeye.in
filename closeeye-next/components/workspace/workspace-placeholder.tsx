/**
 * Sprint-1 placeholder for a Workspace Owner whose surface is built in a later sprint. The shell
 * and navigation are real now; each Owner's content arrives in its sprint (Home S2, Ask S3,
 * People & Activity S4, Care S5). Legacy /family/* remains fully functional until Phase 4.
 */
export function WorkspacePlaceholder({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="text-h2 text-ink">{title}</h1>
      <p className="mt-3 text-body text-muted">{sub}</p>
    </div>
  )
}
