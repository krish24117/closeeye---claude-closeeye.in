import * as React from 'react'

/**
 * A minimal, safe renderer for Ask CloseEye answers — paragraphs, "- " bullets,
 * and **bold**. Renders React nodes (never innerHTML), and the answer shape is
 * constrained by the ask-health system prompt (one opener line, 3–5 short
 * bullets, an optional closing question, sparse bold). No markdown dependency.
 */

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <strong key={key++} className="font-bold text-ink">
        {m[1]}
      </strong>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function MarkdownAnswer({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(EMOJI_RE, '').replace(/\r/g, '').split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []
  let key = 0

  const flushBullets = () => {
    if (!bullets.length) return
    blocks.push(
      <ul key={key++} className="my-1 flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-body-sm leading-relaxed text-ink">
            <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-green" aria-hidden />
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushBullets()
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      bullets.push(bullet[1] ?? '')
      continue
    }
    flushBullets()
    const italicOnly = /^\*(.+)\*$/.exec(line)
    if (italicOnly) {
      blocks.push(
        <p key={key++} className="text-caption italic leading-relaxed text-muted">
          {italicOnly[1]}
        </p>,
      )
    } else {
      blocks.push(
        <p key={key++} className="text-body-sm leading-relaxed text-ink">
          {renderInline(line)}
        </p>,
      )
    }
  }
  flushBullets()

  return <div className={className}>{blocks}</div>
}
