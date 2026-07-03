-- whatsapp_messages — audit log of every outbound Twilio WhatsApp template send.
-- Written exclusively by service-role key from inside edge functions (bypasses RLS).
-- Use this table to debug delivery, detect double-sends, and verify idempotency.

create table if not exists public.whatsapp_messages (
  id          uuid        primary key default gen_random_uuid(),
  to_number   text        not null,
  template    text        not null,
  content_sid text,
  status      text        not null check (status in ('sent', 'failed', 'skipped')),
  twilio_sid  text,
  error       text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.whatsapp_messages enable row level security;
-- Service-role key (used by edge functions) bypasses RLS — no explicit insert policy needed.
-- Admins query via service-role only; no public or user-facing read policy.

comment on table public.whatsapp_messages is
  'Audit log of outbound Twilio WhatsApp template sends from Close Eye edge functions.';

comment on column public.whatsapp_messages.to_number   is 'E.164 with whatsapp: prefix, e.g. whatsapp:+919999999999';
comment on column public.whatsapp_messages.template    is 'Friendly name matching the TEMPLATES registry in _shared/whatsapp.ts';
comment on column public.whatsapp_messages.content_sid is 'Twilio Content SID (HX…) used for the send';
comment on column public.whatsapp_messages.twilio_sid  is 'SM… SID returned by Twilio on success';
comment on column public.whatsapp_messages.payload     is 'ContentVariables map and other send metadata';
