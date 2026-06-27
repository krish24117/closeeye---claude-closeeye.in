-- =====================================================================
-- Seed admin test account (seed-admin@closeeye.test) for QA of /admin.
-- Mirrors the seed-family / seed-companion pattern in 20260615110000.
--
-- NOTE: created PASSWORDLESS (encrypted_password = '') so no credential is
-- committed to the repo — it cannot be logged into until a password is set
-- out-of-band (Supabase dashboard → Auth, or a one-off SQL update). The admin
-- role is applied by DELETE + INSERT on profiles, which bypasses the
-- update-only prevent_role_self_escalation trigger WITHOUT disabling it.
--
-- Safe to re-run. Delete this account before public launch.
-- =====================================================================
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'seed-admin@closeeye.test';
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'seed-admin@closeeye.test', '', now(), now(), now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Seed Admin"}'::jsonb, false, false
    );
  end if;

  -- Replace the auto-created (role='family') profile with an admin one.
  -- INSERT is not covered by the BEFORE UPDATE prevent_role_self_escalation trigger,
  -- so this sets the admin role without disabling any security mitigation.
  delete from public.profiles where id = v_uid;
  insert into public.profiles (id, full_name, role, admin_role, whatsapp_number)
  values (v_uid, 'Seed Admin', 'admin', 'super_admin', '+919900000003');

  raise notice 'Seed admin id: %', v_uid;
end $$;
