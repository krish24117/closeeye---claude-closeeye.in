import type { MomentItemData } from '@/lib/family-report'

/**
 * MomentGallery — the family's memory book. The moments the Guardian shared with
 * their loved one, told warmly (tea together, a walk, old memories, a family call).
 * Reusable.
 */
export function MomentGallery({ items }: { items: MomentItemData[] }) {
  if (items.length === 0) return null
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((m) => (
        <li
          key={m.key}
          className="flex flex-col items-center gap-2 rounded-lg border border-line bg-accent-soft/40 px-3 py-4 text-center"
        >
          <span className="text-2xl" aria-hidden>{m.emoji}</span>
          <span className="text-body-sm font-medium text-ink">{m.label}</span>
        </li>
      ))}
    </ul>
  )
}
