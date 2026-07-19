-- Durable Connect conversations (Product Completion · Priority 1, Decision 2).
--
-- A proper conversation model so a customer can reopen a past thread and continue it across days —
-- not temporary client session history. Additive and backward-compatible: NEW tables only, nothing
-- existing (member_queries, which ask-health keeps writing for safety/SLA) is touched.
--
-- One conversation = a thread of messages. Each assistant turn may carry the "what I understood"
-- snapshot (jsonb) so reopening re-renders the Understand → Reason → Answer sequence faithfully.
-- Owner-scoped RLS: a user only ever sees their own conversations.

create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  loved_one_id uuid references public.loved_ones(id) on delete set null,
  subject_label text,
  title        text,                       -- first question, for the history list
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,  -- denormalised for simple RLS
  role            text not null check (role in ('user', 'assistant')),
  content         text not null default '',
  kind            text not null default 'answer' check (kind in ('answer', 'escalate', 'pending', 'out_of_scope')),
  understanding   jsonb,                    -- the Understanding shown for this turn (assistant turns)
  ambulance_number text,                    -- for a persisted escalation card
  created_at      timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index if not exists conversation_messages_conv_idx on public.conversation_messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- conversations — owner only
create policy "conversations: own select" on public.conversations for select using (auth.uid() = user_id);
create policy "conversations: own insert" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conversations: own update" on public.conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations: own delete" on public.conversations for delete using (auth.uid() = user_id);

-- conversation_messages — owner only (via denormalised user_id)
create policy "conversation_messages: own select" on public.conversation_messages for select using (auth.uid() = user_id);
create policy "conversation_messages: own insert" on public.conversation_messages for insert with check (auth.uid() = user_id);
create policy "conversation_messages: own delete" on public.conversation_messages for delete using (auth.uid() = user_id);
