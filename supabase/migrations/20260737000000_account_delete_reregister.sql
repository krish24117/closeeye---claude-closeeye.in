-- Account deletion → clean re-registration, and a "welcome back" for returning families.
--
-- Problem (launch-audit "delete = silent ban"): the delete-account edge function tries a hard
-- auth-user delete, but three NO-ACTION foreign keys (no ON DELETE clause) blocked it, forcing
-- a 100-year BAN fallback. The banned auth.users row kept the email, so the person could never
-- rejoin. These are audit/reference columns — they should SET NULL on user deletion, not block
-- it. Fixing them lets the hard delete succeed and frees the email. Idempotent.

alter table public.booking_status_history
  drop constraint if exists booking_status_history_changed_by_fkey,
  add  constraint booking_status_history_changed_by_fkey
    foreign key (changed_by) references auth.users(id) on delete set null;

alter table public.member_queries
  drop constraint if exists member_queries_assigned_doctor_id_fkey,
  add  constraint member_queries_assigned_doctor_id_fkey
    foreign key (assigned_doctor_id) references auth.users(id) on delete set null;

alter table public.doctors
  drop constraint if exists doctors_user_id_fkey,
  add  constraint doctors_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

-- Remember deleted emails so a returning family gets a warm "welcome back" instead of being
-- re-onboarded as a stranger. Written by delete-account; cleared by the welcome-back RPC when
-- they return. Service-role / SECURITY DEFINER only — no client policies (RLS on, no grants).
create table if not exists public.deleted_accounts (
  email      text primary key,
  deleted_at timestamptz not null default now()
);
alter table public.deleted_accounts enable row level security;
