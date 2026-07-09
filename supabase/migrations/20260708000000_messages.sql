-- =====================================================================
-- Messages — one conversation thread PER family member (loved_one).
--
-- Each loved_one has an independent thread between the family account and
-- their CloseEye Presence Manager. A thread holds ordinary messages plus
-- system/visit updates (sender='system'), and may carry an image or PDF
-- attachment. This is the long-term product model: every loved one owns
-- their own visits/reports/photos/documents/communication history.
--
-- Ownership is denormalised onto family_user_id (matching the loved_ones
-- convention `family_user_id = auth.uid() or public.is_admin()`) so RLS
-- and family-scoped reads stay simple and fast. The family insert policy
-- still verifies the loved_one actually belongs to the sender.
--
-- Realtime is enabled via the supabase_realtime publication so the thread
-- view receives live updates via postgres_changes (RLS-filtered).
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: idempotent throughout.
-- =====================================================================

create table if not exists public.messages (
  id                 uuid primary key default gen_random_uuid(),
  loved_one_id       uuid not null references public.loved_ones(id) on delete cascade,
  family_user_id     uuid not null references auth.users(id) on delete cascade,   -- thread owner (denormalised from loved_ones)
  sender             text not null check (sender in ('family', 'closeeye', 'system')),
  body               text,
  attachment_url     text,
  attachment_type    text check (attachment_type in ('image', 'pdf')),
  related_booking_id uuid references public.booking_requests(id) on delete set null,
  read_at            timestamptz,                                                  -- when the FAMILY read it (null = unread); n/a for family-sent
  created_at         timestamptz not null default now(),
  constraint messages_body_or_attachment check (body is not null or attachment_url is not null)
);

-- Thread fetch: newest-last within a loved_one's thread.
create index if not exists messages_loved_one_created_idx on public.messages(loved_one_id, created_at);
-- Unread badge: messages TO the family not yet read.
create index if not exists messages_unread_idx on public.messages(family_user_id)
  where read_at is null and sender <> 'family';

alter table public.messages enable row level security;

-- Family reads their own threads; admins (Presence Manager) read all.
drop policy if exists "Messages: read own or admin" on public.messages;
create policy "Messages: read own or admin"
  on public.messages for select
  using (family_user_id = auth.uid() or public.is_admin());

-- Family may send only into a thread for a loved_one they own, tagged sender='family'.
drop policy if exists "Messages: family send own" on public.messages;
create policy "Messages: family send own"
  on public.messages for insert
  with check (
    family_user_id = auth.uid()
    and sender = 'family'
    and exists (
      select 1 from public.loved_ones lo
      where lo.id = messages.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

-- Family may update their own rows (used to stamp read_at); admins may update all.
drop policy if exists "Messages: family mark read" on public.messages;
create policy "Messages: family mark read"
  on public.messages for update
  using (family_user_id = auth.uid() or public.is_admin())
  with check (family_user_id = auth.uid() or public.is_admin());

-- Admin (Presence Manager) full manage across every thread — covers closeeye/system inserts.
drop policy if exists "Messages: admin manage" on public.messages;
create policy "Messages: admin manage"
  on public.messages for all
  using (public.is_admin())
  with check (public.is_admin());

-- Enable Realtime. If this errors (publication absent on the target project),
-- enable it via Supabase Dashboard -> Database -> Replication -> messages.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
