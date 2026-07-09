-- =====================================================================
-- CloseEye Connect — voice notes in messages (Increment 2, part 3)
--
-- Allow message attachments of type 'audio' (voice notes). The existing private
-- `message-attachments` bucket has NO mime whitelist, so it already accepts audio
-- — NO new bucket. Voice notes reuse the same <family_user_id>/<loved_one_id>/<file>
-- path + the same upload/read RLS. Idempotent.
-- =====================================================================
alter table public.messages drop constraint if exists messages_attachment_type_check;
alter table public.messages add constraint messages_attachment_type_check
  check (attachment_type in ('image', 'pdf', 'audio'));
