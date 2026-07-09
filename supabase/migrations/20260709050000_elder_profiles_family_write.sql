-- Let families create and edit the Health Profile (elder_profiles) for their own
-- loved ones, through the Customer App. Read + admin + companion policies already
-- exist; this adds family INSERT + UPDATE, scoped to loved ones they own.
-- Safe to re-run (drop/recreate).

drop policy if exists "family_insert_elder_profiles" on public.elder_profiles;
create policy "family_insert_elder_profiles"
  on public.elder_profiles for insert
  with check (
    exists (
      select 1 from public.loved_ones lo
      where lo.id = elder_profiles.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );

drop policy if exists "family_update_elder_profiles" on public.elder_profiles;
create policy "family_update_elder_profiles"
  on public.elder_profiles for update
  using (
    exists (
      select 1 from public.loved_ones lo
      where lo.id = elder_profiles.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.loved_ones lo
      where lo.id = elder_profiles.loved_one_id
        and lo.family_user_id = auth.uid()
    )
  );
