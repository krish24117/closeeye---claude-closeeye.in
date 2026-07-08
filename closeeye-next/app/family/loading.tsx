/** Calm skeleton while the family's space loads. */
export default function FamilyLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 rounded-md bg-line/70" />
        <div className="h-4 w-72 rounded bg-line/50" />
      </div>
      <div className="h-44 rounded-lg bg-line/40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-md bg-line/40" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-lg bg-line/40 lg:col-span-2" />
        <div className="h-80 rounded-lg bg-line/40" />
      </div>
    </div>
  )
}
