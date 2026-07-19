-- Close Eye Connect — Family Memories (the "Remembers" pillar).
--
-- Photos, videos and documents a family captures and recollects later — grouped into MOMENTS
-- ("Siyah's birthday"), each holding many media items. Private to the family by RLS. Unlike the
-- immutable Family Ledger, memories are the family's own belongings: they may rename a moment,
-- re-caption or delete a photo. Files live in a PRIVATE Storage bucket, one folder per user.
--
-- Two tables:
--   memories       — the moment (grouping): a title + when it happened, tied to a loved one.
--   memory_items   — each media file (photo | video | document) inside a moment.

-- ── the moment (grouping) ──────────────────────────────────────────────────────────────────
create table if not exists public.memories (
  id             uuid primary key default gen_random_uuid(),
  family_user_id uuid not null references auth.users(id) on delete cascade,
  loved_one_id   uuid not null references public.loved_ones(id) on delete cascade,
  title          text not null,                        -- "Siyah's birthday"
  occurred_at    timestamptz not null default now(),   -- when the moment happened (for the timeline)
  created_at     timestamptz not null default now()
);
create index if not exists memories_person_idx on public.memories (loved_one_id, occurred_at desc);
create index if not exists memories_owner_idx  on public.memories (family_user_id);

-- ── each media file inside a moment ────────────────────────────────────────────────────────
create table if not exists public.memory_items (
  id             uuid primary key default gen_random_uuid(),
  memory_id      uuid not null references public.memories(id) on delete cascade,
  family_user_id uuid not null references auth.users(id) on delete cascade,
  kind           text not null check (kind in ('photo','video','document')),
  storage_path   text not null,                        -- path inside the private 'memories' bucket
  caption        text,
  created_at     timestamptz not null default now()
);
create index if not exists memory_items_memory_idx on public.memory_items (memory_id, created_at);
create index if not exists memory_items_owner_idx  on public.memory_items (family_user_id);

-- ── RLS: owner-only, and a moment can only be created for a loved one the family owns ────────
alter table public.memories      enable row level security;
alter table public.memory_items  enable row level security;

drop policy if exists memories_select_own on public.memories;
create policy memories_select_own on public.memories
  for select using (family_user_id = auth.uid());

drop policy if exists memories_insert_own on public.memories;
create policy memories_insert_own on public.memories
  for insert with check (
    family_user_id = auth.uid()
    and exists (select 1 from public.loved_ones lo where lo.id = memories.loved_one_id and lo.family_user_id = auth.uid())
  );

drop policy if exists memories_update_own on public.memories;
create policy memories_update_own on public.memories
  for update using (family_user_id = auth.uid()) with check (family_user_id = auth.uid());

drop policy if exists memories_delete_own on public.memories;
create policy memories_delete_own on public.memories
  for delete using (family_user_id = auth.uid());

drop policy if exists memory_items_select_own on public.memory_items;
create policy memory_items_select_own on public.memory_items
  for select using (family_user_id = auth.uid());

drop policy if exists memory_items_insert_own on public.memory_items;
create policy memory_items_insert_own on public.memory_items
  for insert with check (
    family_user_id = auth.uid()
    and exists (select 1 from public.memories m where m.id = memory_items.memory_id and m.family_user_id = auth.uid())
  );

drop policy if exists memory_items_update_own on public.memory_items;
create policy memory_items_update_own on public.memory_items
  for update using (family_user_id = auth.uid()) with check (family_user_id = auth.uid());

drop policy if exists memory_items_delete_own on public.memory_items;
create policy memory_items_delete_own on public.memory_items
  for delete using (family_user_id = auth.uid());

revoke all on public.memories     from authenticated;
revoke all on public.memory_items from authenticated;
grant select, insert, update, delete on public.memories     to authenticated;
grant select, insert, update, delete on public.memory_items to authenticated;

-- ── the PRIVATE storage bucket + owner-only object policies ──────────────────────────────────
-- Created here so no dashboard step is needed. Files are stored under a top-level folder named
-- by the user's id ( <uid>/<loved_one_id>/<uuid> ), which is what the object policies enforce.
insert into storage.buckets (id, name, public)
  values ('memories', 'memories', false)
  on conflict (id) do nothing;

drop policy if exists memories_obj_select on storage.objects;
create policy memories_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists memories_obj_insert on storage.objects;
create policy memories_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists memories_obj_delete on storage.objects;
create policy memories_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);
