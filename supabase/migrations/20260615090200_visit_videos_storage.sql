-- =====================================================================
-- Private storage bucket for visit-report videos (up to 50MB,
-- mp4/mov), mirroring the visit-photos bucket and policies.
--
-- Videos are stored at "<booking_id>/<filename>" so policies can join
-- back to bookings/loved_ones via the first path segment
-- (storage.foldername(name))[1].
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: the bucket upsert is idempotent and policies are
-- dropped and recreated before being added.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-videos', 'visit-videos', false, 52428800, array['video/mp4','video/quicktime'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visit videos: companion upload own" on storage.objects;
create policy "Visit videos: companion upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'visit-videos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.companion_id = public.current_companion_id()
    )
  );

drop policy if exists "Visit videos: read own family, own companion, or admin" on storage.objects;
create policy "Visit videos: read own family, own companion, or admin"
  on storage.objects for select
  using (
    bucket_id = 'visit-videos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and (
            b.companion_id = public.current_companion_id()
            or exists (
              select 1 from public.loved_ones lo
              where lo.id = b.loved_one_id and lo.family_user_id = auth.uid()
            )
          )
      )
    )
  );
