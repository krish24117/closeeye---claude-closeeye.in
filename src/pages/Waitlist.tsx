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
  urgency: z.enum(['this_week','one_to_three_months','exploring']),
  support_needed: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function WaitlistPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
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
      if (error.code === '23505') setServerError('This email is already on our waitlist!')
      else setServerError('Something went wrong. Please WhatsApp us at +91 90002 21261.')
      return
    }
    setSuccess(true)
  }

  if (success) return (
    <main>
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-5">🎉</div>
          <h2 className="font-serif text-3xl text-green-900 mb-3">You're on the list!</h2>
          <p className="text-gray-500 leading-relaxed mb-8">We've received your details and will reach out on WhatsApp within 24 hours.</p>
          <a href="https://wa.me/919000221261" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-800 text-white font-semibold px-7 py-3 rounded-xl hover:bg-green-700 transition-colors">
            💬 WhatsApp Us Now
          </a>
        </div>
      </div>
    </main>
  )

  return (
    <main>
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white px-6 py-20 text-center">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Waitlist</p>
        <h1 className="font-serif text-4xl mb-4">Be first in your city.</h1>
        <p className="text-white/65 max-w-md mx-auto">Tell us where your loved one lives and what kind of support would help.</p>
      </div>
      <section className="max-w-xl mx-auto px-6 py-14">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Full name *</label>
              <input {...register('full_name')} placeholder="Rahul Mehta" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Email *</label>
              <input {...register('email')} type="email" placeholder="rahul@email.com" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">WhatsApp number *</label>
              <input {...register('whatsapp_number')} placeholder="+1 555 000 0000" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
              {errors.whatsapp_number && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-1.5">Your country *</label>
              <select {...register('country')} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 bg-white">
                <option value="">Select</option>
                {['USA','UK','UAE','Canada','Australia','Singapore','New Zealand','Germany','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">Loved one's city in India *</label>
            <input {...register('loved_one_city')} placeholder="e.g. Hyderabad, Mumbai..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
            {errors.loved_one_city && <p className="text-red-500 text-xs mt-1">{errors.loved_one_city.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-2">How soon do you need support? *</label>
            <div className="space-y-2">
              {[['this_week','Within a week — it\'s urgent'],['one_to_three_months','Within 1–3 months'],['exploring','Just exploring for now']].map(([v,l])=>(
                <label key={v} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50">
                  <input type="radio" value={v} {...register('urgency')} className="accent-green-700" />
                  <span className="text-sm text-gray-700">{l}</span>
                </label>
              ))}
            </div>
            {errors.urgency && <p className="text-red-500 text-xs mt-1">{errors.urgency.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1.5">What support would help? <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea {...register('support_needed')} rows={3} placeholder="Tell us about your situation..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
          {serverError && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{serverError}</p>}
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-green-800 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl transition-colors text-sm">
            {isSubmitting ? 'Joining...' : 'Join Waitlist — We\'ll be in touch within 24 hours'}
          </button>
          <p className="text-xs text-center text-gray-400">No spam, ever. We'll reach out on WhatsApp.</p>
        </form>
      </section>
    </main>
  )
}
