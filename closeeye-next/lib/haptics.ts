import { Capacitor } from '@capacitor/core'

/**
 * Gentle haptic feedback for key moments — OTP verified, booking/payment success,
 * emergency, assignment, pull-to-refresh. On native (iOS/Android) this uses the
 * Capacitor Haptics engine for a crisp Taptic feel; on the web it falls back to
 * `navigator.vibrate`; and no-ops where unsupported (most desktops).
 */
export type Haptic = 'light' | 'success' | 'warning' | 'error' | 'emergency'

const PATTERNS: Record<Haptic, number | number[]> = {
  light: 8,
  success: [10, 40, 20],
  warning: [20, 60, 20],
  error: [40, 30, 40],
  emergency: [60, 40, 60, 40, 60],
}

async function nativeHaptic(kind: Haptic): Promise<void> {
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
  switch (kind) {
    case 'light':
      return Haptics.impact({ style: ImpactStyle.Light })
    case 'success':
      return Haptics.notification({ type: NotificationType.Success })
    case 'warning':
      return Haptics.notification({ type: NotificationType.Warning })
    case 'error':
      return Haptics.notification({ type: NotificationType.Error })
    case 'emergency':
      // A firmer double-tap for emergencies.
      await Haptics.impact({ style: ImpactStyle.Heavy })
      return Haptics.impact({ style: ImpactStyle.Heavy })
  }
}

export function haptic(kind: Haptic = 'light'): void {
  if (Capacitor.isNativePlatform()) {
    void nativeHaptic(kind).catch(() => {
      /* native haptics unavailable */
    })
    return
  }
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    /* unsupported */
  }
}
