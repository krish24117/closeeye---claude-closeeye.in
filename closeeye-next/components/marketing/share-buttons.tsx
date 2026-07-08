'use client'

import { useEffect, useState } from 'react'
import { Share2, Link2, Check } from 'lucide-react'
import { BrandGlyph, type BrandName } from '@/components/ui/brand-glyph'
import { isNative, nativeShare } from '@/lib/native'
import { cn } from '@/lib/utils'

/**
 * Elegant, monochrome social sharing for marketing content (stories, articles,
 * care guides). MARKETING SITE ONLY — never render inside any dashboard.
 * Uses the native share sheet where available, with tasteful per-network links.
 */
export function ShareButtons({ title, url, className }: { title: string; url?: string; className?: string }) {
  const [href, setHref] = useState(url ?? '')
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (!url && typeof window !== 'undefined') setHref(window.location.href)
    if (isNative() || (typeof navigator !== 'undefined' && typeof navigator.share === 'function')) setCanNativeShare(true)
  }, [url])

  const enc = encodeURIComponent
  const targets: { name: BrandName; label: string; href: string }[] = href
    ? [
        { name: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${href}`)}` },
        { name: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(href)}&text=${enc(title)}` },
        { name: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(href)}` },
        { name: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(href)}` },
      ]
    : []

  const doShare = async () => {
    // Native share sheet first (iOS/Android), then the web Share API.
    if (await nativeShare({ title, url: href })) return
    try {
      await navigator.share({ title, url: href })
    } catch {
      /* user cancelled — nothing to do */
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — silent */
    }
  }

  const btn =
    'grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-muted transition-colors hover:border-accent hover:text-ink'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="mr-1 text-caption font-semibold uppercase tracking-widest text-muted">Share</span>
      {canNativeShare && (
        <button type="button" onClick={doShare} aria-label="Share" className={btn}>
          <Share2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
      {targets.map((t) => (
        <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${t.label}`} className={btn}>
          <BrandGlyph name={t.name} className="h-4 w-4" />
        </a>
      ))}
      <button type="button" onClick={copy} aria-label={copied ? 'Link copied' : 'Copy link'} className={btn}>
        {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Link2 className="h-4 w-4" strokeWidth={1.5} />}
      </button>
    </div>
  )
}
