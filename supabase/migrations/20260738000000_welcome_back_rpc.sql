-- Welcome-back: when a returning family (an email we previously deleted) signs back in, greet
-- them warmly and clear the record so it fires exactly once. SECURITY DEFINER + auth.email()
-- so a caller can only ever claim their OWN email — no way to probe others'. Idempotent.
create or replace function public.claim_welcome_back()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.email();
  v_hit   boolean := false;
begin
  if v_email is null then return false; end if;
  with d as (
    delete from public.deleted_accounts where lower(email) = lower(v_email) returning 1
  )
  select exists (select 1 from d) into v_hit;
  return v_hit;
end;
$$;

grant execute on function public.claim_welcome_back() to authenticated;
