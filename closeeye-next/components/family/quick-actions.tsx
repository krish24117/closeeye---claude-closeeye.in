import { CalendarPlus, MessageCircle, FileDown, UserCog } from 'lucide-react'
import { ActionCard, type ActionCardData } from '@/components/family/action-card'

const ACTIONS: ActionCardData[] = [
  {
    label: 'Book another visit',
    description: 'Schedule a Home Wellbeing Visit with your Guardian.',
    href: '/book',
    icon: CalendarPlus,
  },
  {
    label: 'Message Presence Manager',
    description: 'Talk directly to the person coordinating your family’s care.',
    href: '/family/messages',
    icon: MessageCircle,
  },
  {
    label: 'Download latest report',
    description: 'The latest visit summary, photos and notes.',
    href: '/family/documents',
    icon: FileDown,
  },
  {
    label: 'Update family details',
    description: 'Keep preferences and emergency contacts up to date.',
    href: '/family/members',
    icon: UserCog,
  },
]

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACTIONS.map((a) => (
        <ActionCard key={a.label} {...a} />
      ))}
    </div>
  )
}
