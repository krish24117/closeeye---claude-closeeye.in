// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Service knowledge base
//
// The ONLY source of truth for service answers. Ask Close Eye must answer
// service questions strictly from these entries — never invent a price,
// policy, coverage area, or vetting claim.
//
// ⚠️  Every answer marked `needsVerify: true` is a DRAFT. Replace it with your
//     real process before launch. Never publish a check you don't perform.
// ─────────────────────────────────────────────────────────────────────────

export interface KBEntry {
  id: string;
  /** Words/phrases that signal this topic (helps routing + the model). */
  triggers: string[];
  /** The approved answer, in Close Eye's warm voice. EDIT THESE. */
  answer: string;
  /** Pricing / booking / "how to start" → capture the lead after answering. */
  buyingIntent?: boolean;
  /** Draft that must be confirmed against real operations before launch. */
  needsVerify?: boolean;
}

export const SERVICE_KB: KBEntry[] = [
  {
    id: "what_we_do",
    triggers: ["what does close eye do", "how does it help", "what is close eye", "what do you offer", "kya karte ho", "ela help chestaru"],
    answer:
      "Close Eye is your trusted presence in India when you can't be there. A trained companion visits your parent regularly for wellness check-ins and company, and you get a WhatsApp update — often with a photo — after every visit. A dedicated care coordinator helps with doctor appointments, medicines and daily needs, and steps in quickly in an emergency. And Ask Close Eye is here any time you have a health question.",
  },
  {
    id: "vetting",
    triggers: ["how do you choose", "vet", "background check", "who comes", "trust", "verify your staff", "are they safe", "kaun aayega", "background"],
    answer:
      "That's the most important question you can ask. Every Close Eye companion is identity- and background-verified, interviewed in person, and trained under Aishwarya, our Chief of Care, with guidance from our medical advisors. We match a companion to your parent's needs and personality, supervise their visits, and act on your feedback — you're never handing your parent to a stranger.",
    needsVerify: true, // ← replace with your ACTUAL vetting steps
  },
  {
    id: "pricing",
    triggers: ["how much", "cost", "price", "pricing", "charges", "fees", "kitna", "kitne ka", "monthly", "plan cost"],
    answer:
      "You can start as a Founding Member for ₹100. Our NRI elder-care plan is ₹1,500/month and includes regular companion visits, check-ins, WhatsApp updates and coordinator support, with additional on-demand services available.",
    buyingIntent: true,
    needsVerify: true, // ← confirm current pricing + exact inclusions
  },
  {
    id: "whats_included",
    triggers: ["what is included", "what do i get", "what's in the plan", "inclusions", "plan me kya", "features"],
    answer:
      "The monthly care plan includes regular in-person companion visits, wellness check-ins, a WhatsApp update after each visit, a dedicated care coordinator, help coordinating doctor visits, and access to Ask Close Eye. On-demand services (errands, escorting to appointments, and more) are available as add-ons.",
    needsVerify: true,
  },
  {
    id: "coverage",
    triggers: ["which areas", "where do you work", "do you cover", "location", "available in", "kaha", "areas", "city"],
    answer:
      "We currently serve [LIST YOUR LIVE AREAS — e.g. specific Hyderabad societies]. If your parent is just outside our current areas, tell us where and we'll let you know our plans.",
    needsVerify: true, // ← list real serviceable areas
  },
  {
    id: "how_to_start",
    triggers: ["how do i start", "how to begin", "sign up", "join", "subscribe", "book", "get started", "kaise shuru", "register"],
    answer:
      "Getting started is simple: sign up at closeeye.in or message us on WhatsApp, share a few details about your parent, and our team sets up their care within a couple of days.",
    buyingIntent: true,
    needsVerify: true, // ← confirm real onboarding timeline
  },
  {
    id: "emergencies",
    triggers: ["emergency", "what if something happens", "emergencies", "3am", "urgent", "hospital", "ambulance"],
    answer:
      "If something urgent happens, your care coordinator is alerted immediately and helps arrange the right care, including getting your parent to a nearby hospital, while keeping you informed across time zones. Ask Close Eye also recognises emergency situations and escalates them straight to our team.",
    needsVerify: true,
  },
  {
    id: "founder_contact",
    triggers: ["talk to founder", "speak to someone", "call you", "talk to a person", "aishwarya", "team", "contact"],
    answer:
      "Of course — we'd be glad to talk before you decide. You can speak with Aishwarya, our Chief of Care, or our team directly. Share your details and we'll reach out, or message us on WhatsApp any time.",
    buyingIntent: true,
  },
];

/** Quick buying-intent check used when no KB entry is matched yet. */
export const BUYING_INTENT_TERMS = [
  "how much", "cost", "price", "pricing", "charge", "fees", "kitna",
  "sign up", "join", "subscribe", "book", "get started", "how do i start", "register",
];
