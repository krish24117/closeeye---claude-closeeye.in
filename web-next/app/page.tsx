import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { HomeContent } from './HomeContent'

export const revalidate = 60

const TITLE = "Close Eye — When you can't be there, Close Eye can."
const DESCRIPTION = 'Verified wellbeing visits and trusted local support for your loved ones in India. Real visits. Real photos. Real reports.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`/api/og?title=${encodeURIComponent(TITLE)}`] },
}

async function getWaitlistCount() {
  const { count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
  return count !== null && count > 50 ? count : 50
}

export default async function Page() {
  const waitlistCount = await getWaitlistCount()
  return <HomeContent initialWaitlistCount={waitlistCount} />
}
