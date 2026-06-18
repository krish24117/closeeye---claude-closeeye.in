import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Question definitions ─────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Do you have elderly parents or family members living in India?',
    type: 'single' as const,
    options: [
      'Yes, in Hyderabad',
      'Yes, in another city in India',
      'No',
    ],
  },
  {
    id: 'q2',
    text: 'Where do you currently live?',
    type: 'single' as const,
    options: [
      'Same city as my parents',
      'Different city in India',
      'Outside India (NRI)',
    ],
  },
  {
    id: 'q3',
    text: 'What worries you most?',
    subtitle: 'Select all that apply',
    type: 'multi' as const,
    options: [
      'Their health and medical needs',
      "Whether they're eating and taking medicines",
      'Loneliness / lack of company',
      'Emergencies when no one is nearby',
      'Day-to-day tasks (groceries, bills, repairs)',
      'Not knowing how they really are',
    ],
  },
  {
    id: 'q4',
    text: 'Today, how do you check on your elderly parent?',
    type: 'single' as const,
    options: [
      'I visit in person regularly',
      'Phone / video calls',
      'A relative or neighbour helps',
      'A paid attendant / service',
      'I struggle to check on them consistently',
    ],
  },
  {
    id: 'q5',
    text: 'If a verified companion visited your parent and sent you photos + a wellbeing report, how valuable would that be?',
    type: 'single' as const,
    options: [
      "Very valuable — I'd want this",
      'Somewhat valuable',
      'Not sure',
      'Not needed right now',
    ],
  },
]

type Answers = { q1: string; q2: string; q3: string[]; q4: string; q5: string }
type FormData = { name: string; whatsapp: string; email: string; parent_city: string }
type FormErrors = Partial<Record<keyof FormData, string>>

// ── Component ────────────────────────────────────────────────────────────────

export function SurveyPage() {
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || ''

  // step: 0–4 = questions, 5 = lead form, 6 = success
  const [step, setStep] = useState(0)
  const [animKey, setAnimKey] = useState(0) // triggers re-mount animation on step change

  const [answers, setAnswers] = useState<Answers>({ q1: '', q2: '', q3: [], q4: '', q5: '' })
  const [form, setForm] = useState<FormData>({ name: '', whatsapp: '', email: '', parent_city: '' })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Scroll to top on every step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  function goTo(next: number) {
    setStep(next)
    setAnimKey(k => k + 1)
  }

  // ── Single-select handler (auto-advance after brief delay) ──
  function selectSingle(qId: keyof Answers, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
    setTimeout(() => goTo(step + 1), 250)
  }

  // ── Multi-select toggle ──
  function toggleMulti(value: string) {
    setAnswers(prev => {
      const current = prev.q3
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, q3: next }
    })
  }

  // ── Form field handler ──
  function setField(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }))
  }

  // ── Form validation ──
  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = 'Please enter your name'
    if (!form.whatsapp.trim()) errs.whatsapp = 'Please enter your WhatsApp number'
    if (!form.email.trim()) errs.email = 'Please enter your email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.parent_city.trim()) errs.parent_city = "Please enter your parent's city"
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError('')
    try {
      const { error } = await supabase.functions.invoke('survey-submit', {
        body: {
          q1_location: answers.q1 || null,
          q2_residence: answers.q2 || null,
          q3_worries: answers.q3,
          q4_check_method: answers.q4 || null,
          q5_value_perception: answers.q5 || null,
          name: form.name.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim(),
          parent_city: form.parent_city.trim(),
          source: source || null,
        },
      })
      if (error) throw error
      goTo(6)
    } catch {
      setServerError('Something went wrong. Please try again or WhatsApp us at +91 90002 21261.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = step < 5 ? ((step + 1) / 5) * 100 : 100

  // ── Success screen ───────────────────────────────────────────
  if (step === 6) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <Check size={30} className="text-green-700" />
        </div>
        <h2 className="font-serif text-2xl text-green-900 mb-3">Thank you!</h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-xs mb-8">
          Thank you! We'll reach out with early access details. Your parents are in good hands.
        </p>
        <Link
          to="/"
          className="text-sm font-semibold text-green-700 hover:text-green-900 underline underline-offset-2"
        >
          Learn more about Close Eye →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="px-5 pt-safe pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between pt-4">
          {step > 0 && step < 6 ? (
            <button
              onClick={() => goTo(step - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500 -ml-1"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <Link to="/" className="font-serif text-base text-green-900">
            close <span className="text-green-600">eye</span>
          </Link>
          {step < 5 ? (
            <span className="text-xs text-gray-400 font-medium">{step + 1} / 5</span>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </header>

      {/* ── Progress bar ────────────────────────────────────── */}
      {step < 6 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-green-700 transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <div key={animKey} className="flex-1 px-5 py-6 animate-fade-in">

        {/* ── Intro (only on Q1) ────────────────────────────── */}
        {step === 0 && (
          <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-sm text-green-900 leading-relaxed">
              We're building a service to help families care for elderly parents in India — even when they live far away.
              Your answers <strong>(2 minutes)</strong> help us build it right. Thank you.
            </p>
          </div>
        )}

        {/* ── Survey questions (steps 0–4) ─────────────────── */}
        {step < 5 && (() => {
          const q = QUESTIONS[step]
          return (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">
                Question {step + 1} of 5
              </p>
              <h2 className="font-serif text-xl text-green-900 leading-snug mb-1">
                {q.text}
              </h2>
              {q.type === 'multi' && (
                <p className="text-sm text-gray-400 mb-5">{q.subtitle}</p>
              )}
              {q.type !== 'multi' && <div className="mb-5" />}

              <div className="space-y-3">
                {q.options.map(opt => {
                  const answerKey = q.id as keyof Answers
                  const selected = q.type === 'single'
                    ? answers[answerKey] === opt
                    : (answers.q3 as string[]).includes(opt)

                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        q.type === 'single'
                          ? selectSingle(answerKey as 'q1' | 'q2' | 'q4' | 'q5', opt)
                          : toggleMulti(opt)
                      }
                      className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all duration-150 flex items-center gap-3 ${
                        selected
                          ? 'border-green-700 bg-green-50 text-green-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 active:bg-gray-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'border-green-700 bg-green-700' : 'border-gray-300'
                      }`}>
                        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-sm font-medium leading-snug">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {q.type === 'multi' && (
                <button
                  onClick={() => goTo(step + 1)}
                  disabled={answers.q3.length === 0}
                  className="mt-6 w-full bg-green-800 text-white font-semibold py-3.5 rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  Continue →
                </button>
              )}
            </div>
          )
        })()}

        {/* ── Lead capture form (step 5) ────────────────────── */}
        {step === 5 && (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Almost done</p>
            <h2 className="font-serif text-2xl text-green-900 mb-1">Want early access?</h2>
            <p className="text-sm text-gray-500 mb-7 leading-relaxed">
              Leave your details and we'll reach out personally with early access before we launch.
            </p>

            {serverError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
                {serverError}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Priya Sharma"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
                  }`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">WhatsApp number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={e => setField('whatsapp', e.target.value)}
                  placeholder="+1 408 555 0100"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.whatsapp ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
                  }`}
                />
                {formErrors.whatsapp && <p className="text-xs text-red-500 mt-1">{formErrors.whatsapp}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="priya@example.com"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
                  }`}
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>

              {/* Parent city */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Parent's city in India <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.parent_city}
                  onChange={e => setField('parent_city', e.target.value)}
                  placeholder="Hyderabad, Chennai, Bengaluru…"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.parent_city ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
                  }`}
                />
                {formErrors.parent_city && <p className="text-xs text-red-500 mt-1">{formErrors.parent_city}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 w-full bg-green-800 text-white font-semibold py-4 rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                : 'Join Early Access →'
              }
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              We'll reach out on WhatsApp. No spam, ever.
            </p>
          </form>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="px-5 pb-safe pt-4 pb-8 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          © Close Eye · Hyderabad ·{' '}
          <Link to="/privacy-policy" className="underline hover:text-gray-600">Privacy</Link>
        </p>
      </footer>
    </div>
  )
}
