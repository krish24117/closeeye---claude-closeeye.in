import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  whatsapp_number: z.string().min(8, 'Enter a valid WhatsApp number'),
  country: z.string().min(1, 'Select your country'),
  loved_one_city: z.string().min(2, 'Enter your loved one\'s city'),
  urgency: z.enum(['this_week', 'one_to_three_months', 'exploring'], {
    required_error: 'Please select when you need support',
  }),
  support_needed: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const COUNTRIES = ['USA', 'UK', 'UAE', 'Canada', 'Australia', 'Singapore', 'New Zealand', 'Germany', 'Netherlands', 'Other']
const URGENCY_OPTIONS = [
  { value: 'this_week', label: 'Within a week — it\'s urgent', emoji: '🔴' },
  { value: 'one_to_three_months', label: 'Within 1–3 months', emoji: '🟡' },
  { value: 'exploring', label: 'Just exploring for now', emoji: '🟢' },
]

export function WaitlistPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'exploring' } // ✅ Default selected
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const { error } = await supabase.from('waitlist').insert({
      full_name: data.full_name,
      email: data.email,
      whatsapp_number: data.whatsapp_number,
      country: data.country,
      loved_one_city: data.loved_one_city,
      urgency: data.urgency,
      support_needed: data.support_needed || null,
    })
    if (error) {
      if (error.code === '23505') setServerError('This email is already on our waitlist — we\'ll be in touch soon!')
      else setServerError('Something went wrong. Please WhatsApp us at +91 90002 21261.')
      return
    }
    setSuccess(true)
  }

  if (success) return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-md animate-fade-in">
        <div className="text-6xl mb-5">🎉</div>
        <h2 className="font-serif text-2xl sm:text-3xl text-green-900 mb-3">You're on the list!</h2>
        <p className="text-gray-500 leading-relaxed mb-8 text-sm sm:text-base">
          We've received your details and will reach out on WhatsApp within 24 hours. Thank you for trusting Close Eye with your family.
        </p>
        <a
          href="https://wa.me/919000221261"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-800 text-white font-semibold px-7 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
        >
          💬 WhatsApp Us Now
        </a>
      </div>
    </main>
  )

  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Waitlist</p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">Be first in your city.</h1>
        <p className="text-white/65 max-w-md mx-auto text-sm sm:text-base">
          Tell us where your loved one lives and what kind of support would help. We'll reach out within 24 hours.
        </p>
      </div>

      <section className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Full name *</label>
              <input
                {...register('full_name')}
                placeholder="Rahul Mehta"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Email *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="rahul@email.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">WhatsApp number *</label>
              <input
                {...register('whatsapp_number')}
                placeholder="+1 555 000 0000"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"
              />
              {errors.whatsapp_number && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Your country *</label>
              <select
                {...register('country')}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 bg-white transition-colors"
              >
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">Loved one's city in India *</label>
            <input
              {...register('loved_one_city')}
              placeholder="e.g. Hyderabad, Mumbai, Bengaluru..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"
            />
            {errors.loved_one_city && <p className="text-red-500 text-xs mt-1">{errors.loved_one_city.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-900 mb-2">How soon do you need support? *</label>
            <div className="space-y-2">
              {URGENCY_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 sm:p-3.5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50"
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('urgency')}
                    className="accent-green-700 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{opt.emoji} {opt.label}</span>
                </label>
              ))}
            </div>
            {errors.urgency && <p className="text-red-500 text-xs mt-1">{errors.urgency.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">
              What support would help? <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              {...register('support_needed')}
              rows={3}
              placeholder="Tell us a little about your situation — we read every response personally."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 resize-none transition-colors"
            />
          </div>

          {serverError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-800 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Joining waitlist...
              </span>
            ) : 'Join Waitlist — We\'ll be in touch within 24 hours'}
          </button>
          <p className="text-xs text-center text-gray-400">No spam, ever. We'll reach out on WhatsApp to discuss next steps.</p>
        </form>
      </section>
    </main>
  )
}
