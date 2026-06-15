-- =====================================================================
-- Private storage buckets for companion onboarding: ID proof documents
-- (Aadhaar/PAN) and profile photos. Both are admin-only — companions
-- added through this flow don't have an auth.users account.
--
-- Objects are stored at "<companion_id>/<filename>".
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: bucket inserts are idempotent and policies are
-- dropped and recreated before being added.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('companion-documents', 'companion-documents', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('companion-photos', 'companion-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Companion documents: admin manage" on storage.objects;
create policy "Companion documents: admin manage"
  on storage.objects for all
  using (bucket_id = 'companion-documents' and public.is_admin())
  with check (bucket_id = 'companion-documents' and public.is_admin());

drop policy if exists "Companion photos: admin manage" on storage.objects;
create policy "Companion photos: admin manage"
  on storage.objects for all
  using (bucket_id = 'companion-photos' and public.is_admin())
  with check (bucket_id = 'companion-photos' and public.is_admin());
