import { redirect } from 'next/navigation'

/** Messages became Close Eye Connect — keep old links/bookmarks working. */
export default function MessagesMovedToConnect() {
  redirect('/family/connect')
}
