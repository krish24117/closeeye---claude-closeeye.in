'use client'
import { RouteError } from '@/components/ui/route-error'
export default function AdminError({ reset }: { error: Error; reset: () => void }) { return <RouteError reset={reset} /> }
