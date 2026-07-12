import { supabase } from '@/lib/supabase'
import { isNative } from '@/lib/native'

/** Deep link the native app registers for the OAuth callback. */
export const NATIVE_OAUTH_REDIRECT = 'in.closeeye.app://auth/callback'

/**
 * Map raw Supabase auth errors to calm, human copy. We never show a stack-y
 * Supabase string to a worried family member — every failure gets a next step.
 */
export function friendlyAuthError(raw?: string): string {
  const m = (raw ?? '').toLowerCase()
  if (!m) return 'Something went wrong. Please try again.'
  if (m.includes('otp') && (m.includes('expired') || m.includes('invalid'))) return 'That code has expired or isn’t valid. Please request a new one.'
  if (m.includes('token has expired') || m.includes('is invalid') || m.includes('invalid token')) return 'That code has expired or isn’t valid. Please request a new one.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute, then try again.'
  if (m.includes('for security purposes') || m.includes('you can only request')) return 'Please wait a few seconds before requesting another code.'
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'We couldn’t reach the server. Check your connection and try again.'
  if (m.includes('email') && m.includes('valid')) return 'Please enter a valid email address.'
  if (m.includes('signups not allowed') || m.includes('disabled')) return 'Sign-ups are currently closed. Please contact support.'
  if (m.includes('popup') || m.includes('cancel')) return 'Sign-in was cancelled. Please try again.'
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already')) return 'This email is already registered — please sign in instead.'
  if (m.includes('invalid login credentials')) return 'That email or password isn’t right. Please check and try again.'
  if (m.includes('password should be at least') || (m.includes('password') && m.includes('at least'))) return 'Please use a password with at least 8 characters.'
  if (m.includes('not confirmed')) return 'Please confirm your email from the link we sent, then sign in.'
  if (m.includes('weak password') || m.includes('pwned')) return 'Please choose a stronger password.'
  return 'Something went wrong. Please try again.'
}

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
export async function signInWithGoogle(redirectQuery = ''): Promise<{ error: string | null }> {
  if (!isNative()) {
    // Carry founder intent/ref THROUGH the OAuth redirect so it survives a WhatsApp
    // in-app browser handing OAuth to the system browser — localStorage does not
    // cross that boundary, but the return URL does. (Supabase appends &code=… itself.)
    const redirectTo = `${window.location.origin}/auth${redirectQuery ? `?${redirectQuery}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    })
    return { error: error ? friendlyAuthError(error.message) : null }
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
  if (error || !data?.url) return { error: friendlyAuthError(error?.message) }

  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
  return { error: null }
}

/**
 * Create an account with email + password. `session` is true when Supabase
 * "Confirm email" is OFF (the account is usable immediately); false when email
 * confirmation is required (the user must confirm before signing in).
 */
export async function signUpWithPassword(email: string, password: string): Promise<{ error: string | null; session: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
  if (error) return { error: friendlyAuthError(error.message), session: false }
  return { error: null, session: !!data.session }
}

/** Sign in with an existing email + password. */
export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  return { error: error ? friendlyAuthError(error.message) : null }
}

/**
 * Send an email one-time passcode.
 *
 * `signInWithOtp` always mints a 6-digit code AND a link — which the user
 * actually receives depends on the email template. The default (shared-SMTP)
 * template only renders the link, so today users can tap the link; once custom
 * SMTP unlocks template editing and `{{ .Token }}` is added, the SAME call
 * delivers the code to type on the verify screen. We set `emailRedirectTo` so
 * the link keeps working as a fallback either way (web → /auth, native → deep
 * link; open the email on the requesting device — it holds the PKCE verifier).
 */
export async function sendEmailOtp(email: string): Promise<{ error: string | null }> {
  const emailRedirectTo = isNative() ? NATIVE_OAUTH_REDIRECT : `${window.location.origin}/auth`
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo },
  })
  return { error: error ? friendlyAuthError(error.message) : null }
}

/** Verify the 6-digit email code and establish the session. */
export async function verifyEmailOtp(email: string, code: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  })
  if (error) return { error: friendlyAuthError(error.message) }
  if (!data.session) return { error: 'That code didn’t work. Please request a new one.' }
  return { error: null }
}
