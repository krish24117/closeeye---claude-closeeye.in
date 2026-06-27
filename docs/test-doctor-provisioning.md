# Provisioning a test doctor (Doctor Assignment & Verification)

A doctor account is just a normal user whose **`profiles.admin_role = 'doctor'`**.
Its `role` stays **non-admin** on purpose — that keeps `public.is_admin()` false, so
RLS scopes the doctor to **only the queries assigned to them**. Super admins keep
full access.

## Fastest path (Supabase SQL Editor)

1. Have the person **sign up normally** at `closeeye.in/auth` (creates a `family`
   account with a password they choose). Note their email.

2. In **Supabase → SQL Editor**, run:

```sql
-- a) Promote them to a doctor (role stays as-is; only admin_role changes)
update public.profiles
set admin_role = 'doctor'
where id = (select id from auth.users where email = 'doctor@example.com');

-- b) Add their roster entry AND link it to the login in one go
insert into public.doctors (user_id, name, specialisation, hospital, phone, whatsapp, is_active)
select id, 'Dr. Asha Rao', 'General Physician', 'Apollo, Jubilee Hills',
       '+919000000010', '+919000000010', true
from auth.users where email = 'doctor@example.com';
```

   - `whatsapp` must be a WhatsApp-reachable number for the "Assign and notify
     doctor" message to arrive (Twilio is already configured).

3. The doctor **logs in** → they are auto-routed to **`/doctor`** (via `getRoleHome`).

## UI-only path (no SQL)

Once a user already has *any* admin role, you can manage the rest in the console:

1. **Settings → Team members** → change that person's role dropdown to **Doctor**.
   (Note: a brand-new family user won't appear in Team until they have an admin
   role — so the very first promotion needs the SQL in step 2a above, or set it
   from Supabase → Authentication.)
2. **Settings → Doctors** → **Add doctor** (name, specialisation, hospital,
   WhatsApp) and pick the account under **Link to login account**.

## End-to-end test

1. **`/admin/queries`** → click a query → **Assign and notify doctor** → pick the
   doctor → *Assign*. (Doctor gets a WhatsApp; query badge → "Assigned to Dr. X".)
2. Doctor logs in → **`/doctor`** → sees the query → writes a response → *Submit*.
   (Badge → "Under review".)
3. Back in **`/admin/queries`** → open the query → **Mark as published**.
   (Family gets a WhatsApp; the verified answer appears in the family's
   **Dashboard → Ask**. Badge → "Verified".)

## Clean up

```sql
delete from public.doctors where name = 'Dr. Asha Rao';
update public.profiles set admin_role = null
where id = (select id from auth.users where email = 'doctor@example.com');
```
