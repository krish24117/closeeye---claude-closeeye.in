-- =====================================================================
-- Visit PDF generation + delivery pipeline.
--
-- 1. profiles.phone           – family's WhatsApp number for delivery
-- 2. bookings.check_in_photo_path – storage path for the arrival photo
--    taken at check-in (stored immediately so it survives app restarts
--    before the full report is submitted)
-- 3. visit_reports.pdf_url    – signed URL / path of the generated PDF
-- 4. visit-pdfs bucket + RLS  – private bucket for generated PDFs
--
-- Safe to re-run: column additions use "if not exists", bucket insert
-- is idempotent, policies are dropped before recreation.
-- =====================================================================

-- 1. Family WhatsApp number
alter table public.profiles
  add column if not exists phone text;

-- 2. Arrival photo path captured at check-in
alter table public.bookings
  add column if not exists check_in_photo_path text;

-- 3. PDF URL on visit report
alter table public.visit_reports
  add column if not exists pdf_url text;

-- 4. Private storage bucket for generated visit-report PDFs
insert into storage.buckets (id, name, public)
values ('visit-pdfs', 'visit-pdfs', false)
on conflict (id) do nothing;

-- Companion: upload PDF for their own visits
drop policy if exists "Visit PDFs: companion upload" on storage.objects;
create policy "Visit PDFs: companion upload"
  on storage.objects for insert
  with check (
    bucket_id = 'visit-pdfs'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.companion_id = public.current_companion_id()
    )
  );

-- Family / companion / admin: read PDFs for visits they're part of
drop policy if exists "Visit PDFs: read own" on storage.objects;
create policy "Visit PDFs: read own"
  on storage.objects for select
  using (
    bucket_id = 'visit-pdfs'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and b.companion_id = public.current_companion_id()
      )
      or exists (
        select 1 from public.bookings b
        join public.loved_ones lo on lo.id = b.loved_one_id
        where b.id::text = (storage.foldername(name))[1]
          and lo.family_user_id = auth.uid()
      )
    )
  );
