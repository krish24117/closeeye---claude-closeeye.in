-- =====================================================================
-- Admin elder-profile management support
--
--   1. Add a `city` column to elder_profiles. The admin list + form need
--      a city for each elder; previously city lived only on loved_ones,
--      and an elder profile can exist before a family/loved_one is linked.
--   2. Private `elder-photos` storage bucket for elder profile photos,
--      stored at "<elder_profile_id>/<filename>" so read policies can join
--      back to elder_profiles via the first path segment.
--
-- Idempotent: column add uses IF NOT EXISTS, bucket insert is ON CONFLICT
-- DO NOTHING, and policies are dropped and recreated.
-- =====================================================================

alter table public.elder_profiles add column if not exists city text;

insert into storage.buckets (id, name, public)
values ('elder-photos', 'elder-photos', false)
on conflict (id) do nothing;

-- Admin may upload / update / delete elder photos
drop policy if exists "Elder photos: admin insert" on storage.objects;
create policy "Elder photos: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'elder-photos' and public.is_admin());

drop policy if exists "Elder photos: admin update" on storage.objects;
create policy "Elder photos: admin update"
  on storage.objects for update
  using (bucket_id = 'elder-photos' and public.is_admin());

drop policy if exists "Elder photos: admin delete" on storage.objects;
create policy "Elder photos: admin delete"
  on storage.objects for delete
  using (bucket_id = 'elder-photos' and public.is_admin());

-- Anyone who can already see the elder_profiles row may read its photo.
-- This reuses elder_profiles' own RLS (admin / owning family / assigned
-- companion) by checking visibility of the matching row.
drop policy if exists "Elder photos: read if profile visible" on storage.objects;
create policy "Elder photos: read if profile visible"
  on storage.objects for select
  using (
    bucket_id = 'elder-photos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.elder_profiles ep
        where ep.id::text = (storage.foldername(name))[1]
      )
    )
  );
