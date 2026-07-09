-- =====================================================================
-- Private storage bucket for Guardian visit voice notes (audio, up to
-- 10MB), mirroring the visit-photos / visit-videos buckets and policies.
--
-- The in-visit journey lets a Guardian record one voice note; browsers
-- produce audio/webm (Chrome/Android) or audio/mp4 (Safari/iOS), so both
-- are allowed. Stored at "<booking_id>/<filename>" so policies join back
-- to bookings/loved_ones via the first path segment.
--
-- Safe to re-run: idempotent upsert + drop/recreate policies.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-audio', 'visit-audio', false, 10485760, array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visit audio: companion upload own" on storage.objects;
create policy "Visit audio: companion upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'visit-audio'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.companion_id = public.current_companion_id()
    )
  );

drop policy if exists "Visit audio: read own family, own companion, or admin" on storage.objects;
create policy "Visit audio: read own family, own companion, or admin"
  on storage.objects for select
  using (
    bucket_id = 'visit-audio'
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
