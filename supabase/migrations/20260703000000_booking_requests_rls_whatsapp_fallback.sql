-- Allow users to also see booking_requests matched by their WhatsApp number.
-- This is a safety net: if user_id was null (edge-fn JWT parse failure),
-- the row is still visible as long as requester_whatsapp ends with
-- the last 10 digits of the user's whatsapp_number from profiles.

drop policy if exists "booking_requests: own read by whatsapp" on public.booking_requests;
create policy "booking_requests: own read by whatsapp"
  on public.booking_requests
  for select
  using (
    auth.uid() is not null
    and requester_whatsapp <> ''
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.whatsapp_number is not null
        and p.whatsapp_number <> ''
        and requester_whatsapp ilike
              '%' || right(regexp_replace(p.whatsapp_number, '[^0-9]', '', 'g'), 10)
    )
  );
