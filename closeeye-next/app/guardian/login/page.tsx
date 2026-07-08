'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Fingerprint, ArrowRight, ShieldCheck, WifiOff } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { useToast } from '@/components/ui/toast'

export default function GuardianLogin() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string>()

  function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Enter your 10-digit mobile number')
      return
    }
    setError(undefined)
    setStep('otp')
    toast('Code sent to your phone.', 'info')
  }

  function verify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.trim().length < 4) {
      setError('Enter the code we sent you')
      return
    }
    router.push('/guardian')
  }

  function biometric() {
    router.push('/guardian')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Logo />
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} /> Guardian sign in
        </span>
        <h1 className="mt-5 text-h3">Welcome back</h1>
        <p className="mt-2 text-body text-muted">
          {step === 'phone' ? 'Sign in to see today’s visits.' : `We sent a code to +91 ${phone}.`}
        </p>
      </div>

      <div className="mt-8">
        {step === 'phone' ? (
          <form onSubmit={sendCode} className="flex flex-col gap-5">
            <Field label="Mobile number" htmlFor="phone" error={error}>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="10-digit mobile" autoComplete="tel" className="h-14 text-lead" />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Send code <ArrowRight className="h-5 w-5" strokeWidth={1.75} />
            </Button>

            <div className="flex items-center gap-3 py-1 text-caption text-muted">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <Button type="button" variant="secondary" size="lg" className="w-full" onClick={biometric}>
              <Fingerprint className="h-5 w-5" strokeWidth={1.75} /> Sign in with biometrics
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-5">
            <Field label="Verification code" htmlFor="otp" error={error} hint="Demo — enter any 4–6 digits to continue.">
              <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="••••••" className="h-14 text-center text-h3 tracking-[0.4em]" autoFocus />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Verify &amp; continue <ArrowRight className="h-5 w-5" strokeWidth={1.75} />
            </Button>
            <button type="button" onClick={() => setStep('phone')} className="text-body-sm font-semibold text-green hover:underline">
              Change number
            </button>
          </form>
        )}

        <div className="mt-6 rounded-lg border border-line bg-card p-2 shadow-sm">
          <SettingsToggle label="Remember this device" hint="Skip the code next time on this phone" defaultOn />
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-caption text-muted">
          <WifiOff className="h-3.5 w-3.5" strokeWidth={1.5} /> Once signed in, the app works offline on your visits.
        </p>
      </div>
    </div>
  )
}
