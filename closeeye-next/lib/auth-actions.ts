import { supabase } from '@/lib/supabase'
import { isNative } from '@/lib/native'

/** Deep link the native app registers for the OAuth callback. */
export const NATIVE_OAUTH_REDIRECT = 'in.closeeye.app://auth/callback'

/**
 * Continue with Google — works on both web and the native app.
 *
 * Web: a standard OAuth redirect (Supabase auto-detects the returned code on the
 * /auth page and completes the session).
 *
 * Native: Google blocks OAuth inside WebViews, so we open Google in the SYSTEM
 * browser (@capacitor/browser) and let it deep-link back to the app; the session
 * is then completed in the app's deep-link handler (see native-init.tsx).
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isNative()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: 'select_account' },
      },
    })
    return { error: error?.message ?? null }
  }

  // Native: get the URL without redirecting, then open the system browser.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error || !data?.url) return { error: error?.message ?? 'Could not start Google sign-in.' }

  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
  return { error: null }
}
