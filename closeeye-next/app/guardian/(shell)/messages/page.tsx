import { MessageCircle } from 'lucide-react'
import { ComingSoon } from '@/components/guardian/coming-soon'

export default function MessagesStub() {
  return (
    <ComingSoon
      icon={MessageCircle}
      title="Messages"
      description="Your Presence Manager, Operations, and emergency broadcasts — voice, photos and documents."
      milestone="a later milestone"
    />
  )
}
