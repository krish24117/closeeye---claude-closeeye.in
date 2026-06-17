import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  whatsapp_number: z.string().min(8, 'Enter a valid WhatsApp number with country code'),
  country: z.string().min(1, 'Select your country'),
  parent_city: z.string().min(2, "Enter your parent's city in India"),
  people_count: z.coerce.number({ invalid_type_error: 'Enter how many people need care' }).int().min(1, 'Enter how many people need care'),
  care_types: z.array(z.string()).min(1, 'Select at least one care type'),
  situation: z.string().optional(),
  urgency: z.enum(['immediately', 'within_a_week', 'within_a_month', 'just_exploring'], {
    required_error: 'Let us know how soon you need this',
  }),
  budget_range: z.string().optional(),
  website: z.string().optional(), // honeypot
})
type FormData = z.infer<typeof schema>

const COUNTRIES = ['USA', 'UK', 'UAE', 'Canada', 'Australia', 'Singapore', 'New Zealand', 'Germany', 'Netherlands', 'India', 'Other']

const CARE_TYPES = [
  'Regular visits',
  'Daily medical supervision',
  'Post-surgery',
  'Dementia support',
  'Multiple family members',
  'Live-in companion',
  'Hospital coordination',
  'Other',
]

const URGENCY_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'within_a_week', label: 'Within a week' },
  { value: 'within_a_month', label: 'Within a month' },
  { value: 'just_exploring', label: 'Just exploring' },
]

const BUDGET_RANGES = [
  'Under ₹10,000/month',
  '₹10,000 – ₹25,000/month',
  '₹25,000 – ₹50,000/month',
  '₹50,000+/month',
  'Not sure yet',
]

interface CustomCareModalProps {
  open: boolean
  onClose: () => void
}

export function CustomCareModal({ open, onClose }: CustomCareModalProps) {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')
  const mountedAt = useRef(Date.now())

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      mountedAt.current = Date.now()
      setSuccess(false)
      setServerError('')
      reset()
    }
  }, [open, reset])

  async function onSubmit(data: FormData) {
    setServerError('')

    if (data.website || Date.now() - mountedAt.current < 2000) {
      setSuccess(true)
      return
    }

    const { error } = await supabase.functions.invoke('submit-custom-care-request', {
      body: {
        full_name: data.full_name,
        email: data.email,
        whatsapp_number: data.whatsapp_number,
        country: data.country,
        parent_city: data.parent_city,
        people_count: data.people_count,
        care_types: data.care_types,
        situation: data.situation?.trim() || undefined,
        urgency: URGENCY_OPTIONS.find(u => u.value === data.urgency)?.label,
        budget_range: data.budget_range || undefined,
      },
    })
    if (error) {
      setServerError('Something went wrong. Please WhatsApp us at +91 90002 21261.')
      return
    }
    setSuccess(true)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-card-hover max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 sm:p-8 pb-0">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-green-900">Request a custom quote</h2>
            <p className="text-sm text-gray-400 mt-1">Tailored to your family's needs.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 pt-5">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 size={40} className="text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-green-900 mb-2">Thank you.</p>
              <p className="text-sm text-gray-500 mb-6">We'll send you a custom plan within 24 hours.</p>
              <button
                onClick={onClose}
                className="bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="ccm-website">Leave this field blank</label>
                <input type="text" id="ccm-website" tabIndex={-1} autoComplete="off" {...register('website')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Full name *</label>
                  <input {...register('full_name')} placeholder="Rahul Mehta" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 transition-colors" />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Email *</label>
                  <input {...register('email')} type="email" placeholder="rahul@email.com" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 transition-colors" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">WhatsApp number *</label>
                  <input {...register('whatsapp_number')} placeholder="+1 555 000 0000" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 transition-colors" />
                  {errors.whatsapp_number && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_number.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Country you live in *</label>
                  <select {...register('country')} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white transition-colors">
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Parent(s) city in India *</label>
                  <input {...register('parent_city')} placeholder="e.g. Hyderabad, Mumbai..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 transition-colors" />
                  {errors.parent_city && <p className="text-red-500 text-xs mt-1">{errors.parent_city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">People needing care *</label>
                  <input {...register('people_count')} type="number" min={1} placeholder="2" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 transition-colors" />
                  {errors.people_count && <p className="text-red-500 text-xs mt-1">{errors.people_count.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-green-900 mb-2">Care type — select all that apply *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CARE_TYPES.map(type => (
                    <label
                      key={type}
                      className="flex items-center gap-2.5 p-2.5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50"
                    >
                      <input type="checkbox" value={type} {...register('care_types')} className="accent-green-700 w-4 h-4 flex-shrink-0" />
                      <span className="text-xs text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
                {errors.care_types && <p className="text-red-500 text-xs mt-1">{errors.care_types.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">
                  Describe your situation <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea {...register('situation')} rows={3} placeholder="Tell us more about what your family needs..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none transition-colors" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">How soon? *</label>
                  <select {...register('urgency')} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white transition-colors">
                    <option value="">Select</option>
                    {URGENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  {errors.urgency && <p className="text-red-500 text-xs mt-1">{errors.urgency.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">
                    Budget range <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <select {...register('budget_range')} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white transition-colors">
                    <option value="">Select</option>
                    {BUDGET_RANGES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-800 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Request a Quote'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
