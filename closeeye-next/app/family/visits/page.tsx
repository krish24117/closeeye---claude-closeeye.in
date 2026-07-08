import { CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/family/page-header'
import { VisitTabs } from '@/components/family/visit-tabs'
import { Button } from '@/components/ui/button'
import { VISITS } from '@/lib/family-data'

export default function VisitsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Visits"
        subtitle="Every visit, past and planned — each one a moment someone was there."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/book">
              <CalendarPlus className="h-4 w-4" strokeWidth={1.5} /> Book a visit
            </Link>
          </Button>
        }
      />
      <VisitTabs visits={VISITS} />
    </div>
  )
}
