-- ─────────────────────────────────────────────────────────────────────────────
-- Subscription write-guard — enforce webhook/server authority at the DATABASE.
--
-- The app treats the Razorpay webhook as the sole authority for activation, but
-- until now that was only a code convention: the `subscriptions` "insert/update
-- own" RLS policies let a signed-in user write their own row, so a crafted anon
-- request could set status='active', plan_id='trust' and unlock CloseEye Care
-- WITHOUT paying. This trigger closes that hole in the DB itself.
--
-- Rule: the service role (the Razorpay webhook + the razorpay-create-subscription
-- edge function, which both use the service key) may write anything. ANY other
-- writer — an authenticated user via the anon client — may only ever hold an
-- UNPAID 'created' row and choose a plan. They can never grant themselves an
-- active membership or fabricate billing state. This keeps onboarding's
-- selectPlan() working (it writes plan_id + status='created') while making
-- self-activation impossible.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.enforce_subscription_client_write()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
begin
  -- Service role = the payment webhook / server edge functions. Sole authority
  -- for activation + billing fields.
  if jwt_role = 'service_role' then
    return new;
  end if;

  -- Everyone else (an authenticated user through the anon client) is limited to
  -- an unpaid 'created' row. Activation is never client-driven.
  if new.status is distinct from 'created' then
    raise exception 'subscription status is set by the payment webhook only (attempted: %)', new.status
      using errcode = 'check_violation';
  end if;

  -- Billing fields are webhook-only; a client may never fabricate them.
  if new.razorpay_subscription_id is not null
     or coalesce(new.total_paid_paise, 0) <> 0
     or coalesce(new.invoice_count, 0) <> 0
     or new.current_start is not null
     or new.current_end is not null
     or new.next_billing_at is not null
     or new.last_charge_payment_id is not null then
    raise exception 'subscription billing fields are set by the payment webhook only'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_subscription_client_write on public.subscriptions;
create trigger trg_enforce_subscription_client_write
  before insert or update on public.subscriptions
  for each row
  execute function public.enforce_subscription_client_write();
