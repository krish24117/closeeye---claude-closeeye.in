import { User } from 'lucide-react'
import { ComingSoon } from '@/components/guardian/coming-soon'

export default function ProfileStub() {
  return (
    <ComingSoon
      icon={User}
      title="Your profile"
      description="Experience, training, certifications, performance, availability, documents and support."
      milestone="a later milestone"
    />
  )
}
