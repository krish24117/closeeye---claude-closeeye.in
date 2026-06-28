-- =====================================================================
-- Persist the generated visit-report PDF path on the new visits table.
--
-- The companion app renders a PDF at visit completion, uploads it to the
-- existing private `visit-pdfs` bucket (path "<booking_id>/<file>.pdf"),
-- and passes a signed URL to the send-visit-whatsapp edge function for
-- delivery. Storing the path lets the family and companion regenerate a
-- signed download link on demand from history / reports.
--
-- Idempotent.
-- =====================================================================

alter table public.visits add column if not exists pdf_path text;

