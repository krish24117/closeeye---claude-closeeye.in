-- =====================================================================
-- Admin Console: sub-roles + payments ledger.
--   profiles.admin_role  — super_admin | companion | doctor (null = not staff)
--   payments             — forward-compat payment ledger (brief-mandated)
-- Idempotent. Sub-role scoping is enforced in the app layer; RLS here stays
-- is_admin()-gated since all three sub-roles are trusted internal staff.
-- =====================================================================

-- ── profiles.admin_role ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists admin_role text default null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_admin_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_admin_role_check
      check (admin_role is null or admin_role in ('super_admin', 'companion', 'doctor'));
  end if;
end $$;

-- Existing admins become super_admin so nobody is locked out of the console.
update public.profiles
  set admin_role = 'super_admin'
  where role = 'admin' and admin_role is null;

-- ── payments (forward-compat ledger) ─────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  family_user_id      uuid references auth.users(id) on delete set null,
  elder_id            uuid,
  service_type        text,
  amount              integer,                 -- rupees (whole)
  currency            text default 'INR',
  razorpay_payment_id text,
  status              text default 'pending',
  created_at          timestamptz default now()
);

alter table public.payments enable row level security;

drop policy if exists "payments: admin read" on public.payments;
create policy "payments: admin read"
  on public.payments for select using (public.is_admin());

drop policy if exists "payments: own read" on public.payments;
create policy "payments: own read"
  on public.payments for select using (auth.uid() = family_user_id);

create index if not exists payments_created_at_idx on public.payments (created_at desc);
