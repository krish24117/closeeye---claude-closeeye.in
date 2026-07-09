-- =====================================================================
-- Private storage bucket for message attachments (images + PDFs).
--
-- Files are stored at "<family_user_id>/<loved_one_id>/<filename>" so the
-- first path segment is the owning family account and policies stay simple
-- (mirrors the visit-photos bucket convention).
--
-- Run via the Supabase SQL Editor or `supabase db push`.
-- Safe to re-run: the bucket insert is idempotent and policies are dropped
-- and recreated before being added.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- Family uploads only under their own "<family_user_id>/..." folder.
drop policy if exists "Message attachments: family upload own" on storage.objects;
create policy "Message attachments: family upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Family reads their own folder; admins (Presence Manager) read all.
drop policy if exists "Message attachments: read own or admin" on storage.objects;
create policy "Message attachments: read own or admin"
  on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Admin (Presence Manager) full manage — covers closeeye-sent attachments.
drop policy if exists "Message attachments: admin manage" on storage.objects;
create policy "Message attachments: admin manage"
  on storage.objects for all
  using (bucket_id = 'message-attachments' and public.is_admin())
  with check (bucket_id = 'message-attachments' and public.is_admin());
