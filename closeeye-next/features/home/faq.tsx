import Link from 'next/link'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { FAQS } from '@/lib/content'
import { whatsappLink } from '@/lib/site'

export function Faq() {
  const items = FAQS.slice(0, 4) // homepage stays light; full list lives elsewhere

  return (
    <Section id="faq" tone="ivory">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <span className="eyebrow">Questions</span>
          <h2 className="mt-5 text-h2">Good to know</h2>
          <p className="mt-5 max-w-sm text-lead text-muted">
            Still unsure about something? Message us — a real person replies, usually
            within the hour.
          </p>
          <Button asChild variant="secondary" className="mt-7">
            <Link href={whatsappLink()}>Ask on WhatsApp</Link>
          </Button>
        </Reveal>

        <Reveal delay={0.08}>
          <Accordion type="single" collapsible className="border-t border-line">
            {items.map((faq, i) => (
              <AccordionItem key={faq.question} value={`item-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  )
}
