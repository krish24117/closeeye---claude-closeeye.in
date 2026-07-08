import { PageHeader } from '@/components/family/page-header'
import { MessagesThread } from '@/components/family/messages-thread'

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Messages"
        subtitle="A direct, private line to your Presence Manager. Voice, photos, or a few words — whatever's easiest."
      />
      <MessagesThread />
    </div>
  )
}
