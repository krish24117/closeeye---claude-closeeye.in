-- =====================================================================
-- Private storage bucket for visit-report photos.
--
-- Photos are stored at "<booking_id>/<filename>" so policies can join
-- back to bookings/loved_ones via the first path segment
-- (storage.foldername(name))[1].
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: the bucket insert is idempotent and policies are
-- dropped and recreated before being added.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

drop policy if exists "Visit photos: companion upload own" on storage.objects;
create policy "Visit photos: companion upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'visit-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.companion_id = public.current_companion_id()
    )
  );

drop policy if exists "Visit photos: read own family, own companion, or admin" on storage.objects;
create policy "Visit photos: read own family, own companion, or admin"
  on storage.objects for select
  using (
    bucket_id = 'visit-photos'
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
