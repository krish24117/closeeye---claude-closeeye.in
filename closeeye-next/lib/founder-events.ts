import { supabase } from '@/lib/supabase'

/**
 * Founder funnel analytics — honest, minimal, best-effort. Records a landing view
 * or a WhatsApp-CTA tap so the Founder Activation Dashboard can show real
 * clicks + conversion (never fabricated). Fire-and-forget: it must never block
 * the UI, throw, or surface an error — and if the table isn't there yet (before
 * the migration lands), the rejection is swallowed.
 */
export type FounderEventType = 'landing_view' | 'whatsapp_click'

export function logFounderEvent(type: FounderEventType, ref?: string | null): void {
  try {
    void supabase
      .from('founder_events')
      .insert({ event_type: type, ref: (ref ?? '').trim() || null })
      .then(() => {}, () => {})
  } catch {
    /* analytics is best-effort — never let it affect the visitor */
  }
}
