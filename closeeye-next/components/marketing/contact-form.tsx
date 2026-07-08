'use client'

import * as React from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE, whatsappLink } from '@/lib/site'

const inputCls =
  'w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

/**
 * Support form — routes the message to a real channel (WhatsApp) so nothing is
 * lost to a backend that isn't wired yet. Marketing site only.
 */
export function ContactForm() {
  const [name, setName] = React.useState('')
  const [contact, setContact] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [done, setDone] = React.useState(false)

  const valid = name.trim() && contact.trim() && message.trim()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const text = `Hi Close Eye — I'd like to get in touch.\n\nName: ${name.trim()}\nContact: ${contact.trim()}\n\n${message.trim()}`
    window.open(whatsappLink(text), '_blank', 'noopener,noreferrer')
    setDone(true)
  }

  if (done) {
    return (
      <div className="rounded-lg border border-line bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green">
          <MessageCircle className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <h3 className="mt-5 text-h3 text-ink">Thank you, {name.split(' ')[0]}.</h3>
        <p className="mt-2 text-body leading-relaxed text-muted">
          Your message is on its way to our team on WhatsApp. If it didn’t open automatically,
          you can also reach us at{' '}
          <a href={`mailto:${SITE.email}`} className="font-medium text-green underline-offset-2 hover:underline">{SITE.email}</a>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-h3 text-ink">Send us a message</h2>
      <p className="mt-1.5 text-body-sm text-muted">A real person reads every message. We usually reply the same day.</p>

      <label className="mt-6 block text-body-sm"><span className="mb-1.5 block font-medium text-ink">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
      </label>
      <label className="mt-4 block text-body-sm"><span className="mb-1.5 block font-medium text-ink">Email or phone</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="So we can reply" className={inputCls} />
      </label>
      <label className="mt-4 block text-body-sm"><span className="mb-1.5 block font-medium text-ink">How can we help?</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Tell us a little about what you need…" className={`${inputCls} resize-none`} />
      </label>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={!valid}>Send message</Button>
      <p className="mt-3 text-center text-caption text-muted">Sends securely via WhatsApp so nothing gets lost.</p>
    </form>
  )
}
