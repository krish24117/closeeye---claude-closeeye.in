// Scaffolding for "new booking" push alerts. Requesting permission here
// is the first step; actually delivering pushes needs a service worker
// + VAPID keys + a backend subscription store, which is a follow-up.

export const PUSH_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!PUSH_SUPPORTED) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!PUSH_SUPPORTED) return 'denied'
  return Notification.requestPermission()
}
