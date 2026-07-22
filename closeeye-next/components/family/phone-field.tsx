'use client'

import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import type { Country } from 'react-phone-number-input'

/**
 * PhoneField (P1-5) — a country-aware phone input. Wraps react-phone-number-input so an
 * international family enters a number with the right country code, and we STORE it in E.164
 * (e.g. +919000000000) — the exact form lib/platform/locale.dialablePhone turns into a one-tap
 * `tel:` call on the person's page. The calling code is shown but NON-editable, so "+91" is
 * visible and the family only types the local digits. It defaults to the person's selected region
 * (the Country field), yet any country stays pickable via the flag.
 *
 * Styled to match the app's other inputs (the country-field.tsx shell) so it reads as a native
 * field, not a third-party widget. Flags are the library's bundled SVGs — no external image
 * requests. The value is always E.164 or '' (never a partial/national-only string).
 */
export function PhoneField({
  value,
  onChange,
  country,
  id,
}: {
  value: string
  onChange: (e164: string) => void
  /** The person's region code (IN, US, GB, …) — sets the default country / calling code. */
  country?: string
  id?: string
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-line bg-ivory px-4 py-3.5 transition-colors focus-within:border-green focus-within:ring-2 focus-within:ring-green/20 [&_.PhoneInputCountrySelectArrow]:text-muted [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-body [&_.PhoneInputInput]:text-ink [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-muted/70">
      <PhoneInput
        id={id}
        international
        countryCallingCodeEditable={false}
        defaultCountry={(country || undefined) as Country | undefined}
        flags={flags}
        value={value || undefined}
        onChange={(v) => onChange(v ?? '')}
        autoComplete="off"
      />
    </div>
  )
}
