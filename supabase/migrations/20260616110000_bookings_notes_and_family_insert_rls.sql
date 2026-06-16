-- Add notes column to bookings (family can add instructions for the companion)
alter table public.bookings
  add column if not exists notes text;

-- Allow family users to create their own bookings (previously no INSERT policy existed)
create policy "Family: insert own bookings"
  on public.bookings
  for insert
  with check (family_user_id = auth.uid());
