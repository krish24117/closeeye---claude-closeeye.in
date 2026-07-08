/* eslint-disable @next/next/no-img-element */
'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { useToast } from '@/components/ui/toast'
import { getLocalPhoto } from '@/lib/local-photos'
import { whatsappLink } from '@/lib/site'
import {
  fetchThread,
  markThreadRead,
  sendMessage,
  signedAttachmentUrl,
  subscribeToThread,
  uploadAttachment,
} from '@/lib/db/messages'
import type { LovedOne, Message } from '@/lib/db/types'
import { cn } from '@/lib/utils'

type Status = 'loading' | 'ready' | 'error'
type Pending = { path: string; type: 'image' | 'pdf'; previewUrl: string | null; name: string }

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Lazily resolves a private attachment's signed URL and renders it. */
function AttachmentBubble({ path, type, mine }: { path: string; type: 'image' | 'pdf'; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void signedAttachmentUrl(path).then((u) => {
      if (live) setUrl(u)
    })
    return () => {
      live = false
    }
  }, [path])

  if (type === 'image') {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt="Shared photo" className="max-h-72 w-full max-w-[16rem] rounded-md object-cover" />
      </a>
    ) : (
      <span className="grid h-40 w-56 place-items-center rounded-md bg-ink/[0.06]">
        <Loader2 className="h-5 w-5 animate-spin text-muted" strokeWidth={2} />
      </span>
    )
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 transition-opacity hover:opacity-90',
        mine ? 'bg-white/15' : 'bg-card',
      )}
    >
      <FileText className="h-5 w-5 shrink-0" strokeWidth={1.5} />
      <span className="text-body-sm font-medium underline-offset-2 hover:underline">Document (PDF)</span>
    </a>
  )
}

function MessageBubble({ m }: { m: Message }) {
  const mine = m.sender === 'family'
  return (
    <div className={cn('flex max-w-[82%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
      {!mine && <span className="px-1 text-caption font-semibold text-green">Close Eye</span>}
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg px-3.5 py-2.5 text-body-sm',
          mine ? 'rounded-br-sm bg-green text-ivory' : 'rounded-bl-sm bg-accent-soft/60 text-ink',
        )}
      >
        {m.attachment_url && m.attachment_type && (
          <AttachmentBubble path={m.attachment_url} type={m.attachment_type} mine={mine} />
        )}
        {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
      </div>
      <span className="px-1 text-[0.7rem] text-muted">{timeLabel(m.created_at)}</span>
    </div>
  )
}

/**
 * One family member's care conversation — real messages from Supabase with live
 * updates, plus image/PDF attachments. Family bubbles right (green), Close Eye
 * left (soft), system notes centered. This replaces the former mock thread.
 */
export function MessagesThread({ lovedOne }: { lovedOne: LovedOne }) {
  const { user } = useAuth()
  const userId = user?.id
  const toast = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setPhoto(getLocalPhoto(lovedOne.id)), [lovedOne.id])

  const addMessage = useCallback((m: Message) => {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    )
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    setStatus('loading')
    try {
      const rows = await fetchThread(userId, lovedOne.id)
      setMessages(rows)
      setStatus('ready')
      void markThreadRead(userId, lovedOne.id).catch(() => {})
    } catch {
      setStatus('error')
    }
  }, [userId, lovedOne.id])

  useEffect(() => {
    void load()
  }, [load])

  // Live INSERTs (RLS-filtered). Own sends are deduped by id in addMessage.
  useEffect(() => {
    const unsub = subscribeToThread(lovedOne.id, (m) => {
      addMessage(m)
      if (userId && m.sender !== 'family') void markThreadRead(userId, lovedOne.id).catch(() => {})
    })
    return unsub
  }, [lovedOne.id, userId, addMessage])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function handleFile(file: File | undefined) {
    if (!file || !userId) return
    setUploading(true)
    try {
      const { path, type } = await uploadAttachment(userId, lovedOne.id, file)
      setPending({ path, type, previewUrl: type === 'image' ? URL.createObjectURL(file) : null, name: file.name })
    } catch (e) {
      const msg = e instanceof Error && /images and PDFs/.test(e.message)
        ? 'You can attach images and PDFs only.'
        : 'That file couldn’t be attached. Please try again.'
      toast(msg)
    } finally {
      setUploading(false)
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if ((!body && !pending) || sending || !userId) return
    setSending(true)
    try {
      const created = await sendMessage(userId, {
        lovedOneId: lovedOne.id,
        body,
        attachmentPath: pending?.path,
        attachmentType: pending?.type,
      })
      addMessage(created)
      setDraft('')
      setPending(null)
    } catch {
      toast('Your message didn’t send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const firstName = lovedOne.full_name.trim().split(/\s+/)[0]

  return (
    <div className="flex h-[72vh] min-h-[28rem] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      {/* Thread header — whose conversation this is */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Avatar initials={initialsOf(lovedOne.full_name)} src={photo} alt={lovedOne.full_name} size="md" tone="solid" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{lovedOne.full_name}</p>
          <p className="text-caption text-muted">Care conversation · Close Eye team</p>
        </div>
        <a
          href={whatsappLink(`Hi Close Eye — a quick note about ${lovedOne.full_name}.`)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-caption font-semibold text-green hover:underline"
        >
          Continue on WhatsApp
        </a>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
          </div>
        ) : status === 'error' ? (
          <div className="grid h-full place-items-center px-5">
            <ErrorState onRetry={() => void load()} message="We couldn’t load this conversation. Please try again." />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center px-5">
            <EmptyState
              icon={MessageCircle}
              title="Start the conversation"
              hint={`Send a message, photo, or document about ${firstName}. Your Close Eye team will reply right here.`}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-5 py-6">
            {messages.map((m, i) => {
              const prev = messages[i - 1]
              const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-ink/[0.05] px-3 py-1 text-caption font-medium text-muted">
                        {dayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  {m.sender === 'system' ? (
                    <div className="mx-auto max-w-[90%] px-2 text-center text-caption leading-relaxed text-muted">
                      {m.body}
                    </div>
                  ) : (
                    <MessageBubble m={m} />
                  )}
                </Fragment>
              )
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-line px-4 py-3">
        {pending && (
          <div className="mb-2 flex items-center gap-3 rounded-md border border-line bg-ivory px-3 py-2">
            {pending.type === 'image' && pending.previewUrl ? (
              <img src={pending.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded bg-accent-soft text-green">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{pending.name}</span>
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="Remove attachment"
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              void handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading || !!pending}
            aria-label="Attach photo"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-40"
          >
            <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!pending}
            aria-label="Attach document"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-40"
          >
            <Paperclip className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message about ${firstName}…`}
            aria-label="Message"
            className="h-11 flex-1 rounded-full border border-line bg-ivory px-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={(!draft.trim() && !pending) || sending || uploading}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-ivory transition-opacity disabled:opacity-40"
          >
            {sending || uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
            ) : (
              <Send className="h-5 w-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
