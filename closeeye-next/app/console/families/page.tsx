import { FamilyHealthWidget } from '@/components/console/family-health-widget'

export default function FamiliesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Families</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every family you support, with their relationship &amp; service health. Search, filter and open a profile.</p>
      </div>
      <FamilyHealthWidget />
    </div>
  )
}
