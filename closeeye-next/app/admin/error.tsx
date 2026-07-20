'use client'
import { RouteError } from '@/components/ui/route-error'
export default function AdminError({ error, reset }: { error: Error; reset: () => void }) { return <RouteError error={error} reset={reset} /> }
