'use client'

import { FileDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { downloadFile } from '@/lib/download'
import { cn } from '@/lib/utils'

/**
 * Downloads a pre-built (branded) document string. Content is generated on the
 * server and passed in, so this works inside server components. On tap it saves
 * the file and confirms with a toast — ready to swap for a real signed URL later.
 */
export function DownloadButton({
  label,
  filename,
  content,
  mime,
  icon: Icon = FileDown,
  variant = 'primary',
  size = 'sm',
  className,
  iconOnly = false,
  ...rest
}: {
  label: string
  filename: string
  content: string
  mime?: string
  icon?: LucideIcon
  iconOnly?: boolean
} & Pick<ButtonProps, 'variant' | 'size' | 'className' | 'onDark'>) {
  const toast = useToast()
  function handle() {
    downloadFile(filename, content, mime)
    toast(`${label.replace(/^Download\s*/i, '') || 'Your file'} downloaded — check your files.`)
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handle}
        aria-label={label}
        className={cn('grid h-9 w-9 place-items-center rounded-full text-green transition-colors hover:bg-accent-soft', className)}
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handle} {...rest}>
      <Icon className="h-4 w-4" strokeWidth={1.5} /> {label}
    </Button>
  )
}
