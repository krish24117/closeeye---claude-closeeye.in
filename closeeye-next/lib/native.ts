import { Capacitor } from '@capacitor/core'

/**
 * Native bridge helpers. Everything here is safe to call on the web — it checks
 * `isNative()` and falls back to the browser behaviour the PWA already ships.
 * Plugins are dynamically imported so the web bundle never pulls native code.
 */
export const isNative = (): boolean => Capacitor.isNativePlatform()
export const nativePlatform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web'

/** Open an external destination: WhatsApp / tel / mailto / maps / https. */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  // Let the OS route app/scheme links (WhatsApp, dialer, mail, maps).
  if (/^(tel:|mailto:|sms:|geo:|whatsapp:|maps:)/i.test(url)) {
    window.location.href = url
    return
  }
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url, presentationStyle: 'popover' })
}

/** Native share sheet. Returns false on web so the caller can fall back. */
export async function nativeShare(opts: { title?: string; text?: string; url?: string }): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share(opts)
    return true
  } catch {
    return false
  }
}

/**
 * Secure-ish key/value storage. On native this is the Capacitor Preferences
 * store (Keychain-backed on iOS, EncryptedSharedPreferences on Android when the
 * secure-storage plugin is added — see docs/mobile-architecture.md). On web it
 * falls back to localStorage so the same call site works everywhere.
 */
export const secureStore = {
  async set(key: string, value: string): Promise<void> {
    if (!isNative()) {
      try { localStorage.setItem(key, value) } catch {}
      return
    }
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key, value })
  },
  async get(key: string): Promise<string | null> {
    if (!isNative()) {
      try { return localStorage.getItem(key) } catch { return null }
    }
    const { Preferences } = await import('@capacitor/preferences')
    return (await Preferences.get({ key })).value
  },
  async remove(key: string): Promise<void> {
    if (!isNative()) {
      try { localStorage.removeItem(key) } catch {}
      return
    }
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.remove({ key })
  },
}
