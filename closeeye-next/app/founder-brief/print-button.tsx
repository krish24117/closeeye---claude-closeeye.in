'use client'

import { Printer } from 'lucide-react'

/** Screen-only action — triggers the browser's print dialog (Save as PDF, A4). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fb-noprint fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-body-sm font-semibold text-ivory shadow-lg transition-transform duration-200 ease-premium hover:-translate-y-0.5"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} /> Save as PDF
    </button>
  )
}
