-- =====================================================================
-- LOCAL DEV SEED — DO NOT RUN AGAINST PRODUCTION
--
-- Creates 1 family user, 1 companion user, 1 loved one, 1 booking
-- so every /admin, /companion and /dashboard page has real rows to
-- render instead of empty states.
--
-- Run via:  supabase db reset   (local only)
-- Or paste into the Supabase LOCAL SQL Editor.
-- =====================================================================

do $$
declare
  v_family_id uuid;
  v_companion_id uuid;
  v_loved_one_id uuid;
  v_booking_id uuid;
begin
  select id into v_family_id from auth.users where email = 'seed-family@closeeye.test';
  if v_family_id is null then
    v_family_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) values (
      '00000000-0000-0000-0000-000000000000', v_family_id, 'authenticated', 'authenticated',
      'seed-family@closeeye.test', '', now(), now(), now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Seed Family"}'::jsonb, false, false
    );
  end if;

  select id into v_companion_id from auth.users where email = 'seed-companion@closeeye.test';
  if v_companion_id is null then
    v_companion_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) values (
      '00000000-0000-0000-0000-000000000000', v_companion_id, 'authenticated', 'authenticated',
      'seed-companion@closeeye.test', '', now(), now(), now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Seed Companion"}'::jsonb, false, false
    );
  end if;

  alter table public.profiles disable trigger prevent_role_self_escalation;
  update public.profiles set role = 'companion', whatsapp_number = '+919900000002' where id = v_companion_id;
  update public.profiles set whatsapp_number = '+919900000001' where id = v_family_id;
  alter table public.profiles enable trigger prevent_role_self_escalation;

  insert into public.companions (id, full_name, phone, city, status)
  values (v_companion_id, 'Seed Companion', '+919900000002', 'Hyderabad', 'approved')
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, city = excluded.city, status = excluded.status;

  select id into v_loved_one_id from public.loved_ones where family_user_id = v_family_id;
  if v_loved_one_id is null then
    insert into public.loved_ones (
      family_user_id, full_name, age, city, address,
      medical_notes, doctor_name, nearest_hospital,
      emergency_contact_name, emergency_contact_phone
    ) values (
      v_family_id, 'Seed Grandma', 78, 'Hyderabad', '12 MG Road, Banjara Hills, Hyderabad',
      'Mild hypertension, takes BP medication daily at 8am',
      'Dr. Rao', 'Apollo Hospital, Jubilee Hills',
      'Seed Family', '+919900000001'
    )
    returning id into v_loved_one_id;
  end if;

  select id into v_booking_id from public.bookings where loved_one_id = v_loved_one_id;
  if v_booking_id is null then
    insert into public.bookings (
      loved_one_id, companion_id, status, payment_status,
      amount_paise, companion_payout_paise, service_type, scheduled_at
    ) values (
      v_loved_one_id, v_companion_id, 'companion_assigned', 'paid',
      150000, 100000, 'companion_visit_single', now() + interval '2 days'
    )
    returning id into v_booking_id;
  end if;

  raise notice 'Seed family profile id: %', v_family_id;
  raise notice 'Seed companion profile id: %', v_companion_id;
  raise notice 'Seed loved_one id: %', v_loved_one_id;
  raise notice 'Seed booking id: %', v_booking_id;
end $$;
