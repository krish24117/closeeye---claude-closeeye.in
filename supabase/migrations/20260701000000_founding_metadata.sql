-- Founding member metadata: number, date, and waitlist flag
-- founding_number: auto-assigned sequential integer when membership activates
-- founding_date: timestamp of activation
-- is_waitlisted: set by waitlist-signup edge function (free pre-launch access)

alter table public.profiles
  add column if not exists founding_number  integer unique,
  add column if not exists founding_date    timestamptz,
  add column if not exists is_waitlisted    boolean not null default false;
