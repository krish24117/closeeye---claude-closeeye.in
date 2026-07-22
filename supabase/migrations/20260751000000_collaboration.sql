-- =====================================================================
-- Collaboration & Delegation Platform — Phase 2 persistence.
--
-- Persists the frozen, provider-independent collaboration model (lib/collaboration):
-- a Trusted Network of people, purposeful invitations, delegated assignments, per-object
-- discussion, and a timeline/graph event feed. It reuses the understanding platform's
-- vocabulary (Domain, Space) and the existing authorization primitives; it changes none.
--
-- Design decisions (from the CTO product review):
--   • Person-to-person, not family-to-family. An assignee/invitee is a TRUSTED IDENTITY —
--     family member, Presence Manager, Guardian, doctor, lawyer, CA, business partner, or a
--     future role — never a hardcoded enum. `role` and `domain` are DATA (plain text), so new
--     trusted roles and new life domains need NO schema change.
--   • Objects are referenced POLYMORPHICALLY (object_type + object_id + domain + space + label),
--     so every object across the product is collaborative without a central objects table.
--   • Every invitation carries a PURPOSE (enforced) — it solves a problem, never "just adds a person".
--
-- RLS scope for Phase 2: the family owner and their Presence Manager / Super Admin
-- (public.can_manage_family). Cross-account access for an invited external professional (via
-- trusted_identities.linked_user_id) lands with the accept/decline phase — the column exists now
-- so that phase needs no migration, but no policy opens rows to it yet.
--
-- Run via the Supabase SQL Editor or `supabase db push`. Idempotent (if not exists / or replace).
-- =====================================================================

-- ── shared access predicate: the family owner, or their PM / Super Admin ─────────────────────
create or replace function public.owns_or_manages_family(p_family_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = p_family_user_id or public.can_manage_family(p_family_user_id);
$$;
grant execute on function public.owns_or_manages_family(uuid) to authenticated, anon;

-- ── 1. Trusted Identity — the extensible person model ────────────────────────────────────────
create table if not exists public.trusted_identities (
  id                  uuid primary key default gen_random_uuid(),
  family_user_id      uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  role                text not null,                     -- CollaborationRole, as DATA (no enum, by design)
  relationship        text,                              -- "sister", "family doctor", "corporate lawyer"
  organization        text,                              -- optional affiliation: a clinic, a firm, a company
  contact             text,                              -- email / phone, for invitations (person-to-person)
  linked_user_id      uuid references auth.users(id) on delete set null,  -- if they have their own Close Eye account
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified','pending','verified')),
  availability        text not null default 'unknown'
                        check (availability in ('available','busy','unavailable','unknown')),
  created_at          timestamptz not null default now()
);
create index if not exists trusted_identities_owner_idx  on public.trusted_identities (family_user_id);
create index if not exists trusted_identities_linked_idx on public.trusted_identities (linked_user_id);

-- ── 2. Trusted permissions — per-domain, scoped trust (change permissions from one place) ─────
create table if not exists public.trusted_permissions (
  id             uuid primary key default gen_random_uuid(),
  identity_id    uuid not null references public.trusted_identities(id) on delete cascade,
  family_user_id uuid not null references auth.users(id) on delete cascade,  -- denormalized for RLS
  domain         text not null,                          -- Domain, as DATA
  can_view       boolean not null default true,
  can_comment    boolean not null default false,
  can_complete   boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (identity_id, domain)
);
create index if not exists trusted_permissions_owner_idx on public.trusted_permissions (family_user_id);

-- ── 3. Invitations — always with a purpose ───────────────────────────────────────────────────
create table if not exists public.collaboration_invitations (
  id                  uuid primary key default gen_random_uuid(),
  family_user_id      uuid not null references auth.users(id) on delete cascade,
  object_type         text not null,
  object_id           text not null,
  object_label        text not null,
  domain              text not null,
  space               text,
  invitee_identity_id uuid references public.trusted_identities(id) on delete set null,
  invitee_contact     text,                              -- when inviting someone not yet in the network
  role                text not null,
  purpose             text not null check (length(btrim(purpose)) > 0),  -- ENFORCED: it must solve a problem
  status              text not null default 'pending'
                        check (status in ('pending','accepted','declined','expired')),
  invited_by          uuid not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  responded_at        timestamptz
);
create index if not exists collab_inv_owner_idx  on public.collaboration_invitations (family_user_id, created_at desc);
create index if not exists collab_inv_object_idx on public.collaboration_invitations (object_type, object_id);

-- ── 4. Assignments — delegate a responsibility to ANY trusted identity ───────────────────────
create table if not exists public.collaboration_assignments (
  id                  uuid primary key default gen_random_uuid(),
  family_user_id      uuid not null references auth.users(id) on delete cascade,
  object_type         text not null,
  object_id           text not null,
  object_label        text not null,
  domain              text not null,
  space               text,
  task                text not null,
  assignee_identity_id uuid not null references public.trusted_identities(id) on delete cascade,
  due_at              timestamptz,                        -- "Today / Tomorrow / This week" resolves to a time
  status              text not null default 'open'
                        check (status in ('open','in_progress','done','blocked')),
  assigned_by         uuid not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);
create index if not exists collab_asg_owner_idx    on public.collaboration_assignments (family_user_id, created_at desc);
create index if not exists collab_asg_object_idx   on public.collaboration_assignments (object_type, object_id);
create index if not exists collab_asg_assignee_idx on public.collaboration_assignments (assignee_identity_id);

-- ── 5. Threads — an object owns its own discussion (never a generic chat room) ────────────────
create table if not exists public.collaboration_threads (
  id                 uuid primary key default gen_random_uuid(),
  family_user_id     uuid not null references auth.users(id) on delete cascade,
  object_type        text not null,
  object_id          text not null,
  domain             text not null,
  space              text,
  author_identity_id uuid references public.trusted_identities(id) on delete set null,  -- who is speaking
  author_user_id     uuid references auth.users(id) on delete set null,                 -- the account that posted
  body               text not null check (length(btrim(body)) > 0),
  created_at         timestamptz not null default now()
);
create index if not exists collab_thread_object_idx on public.collaboration_threads (object_type, object_id, created_at);
create index if not exists collab_thread_owner_idx  on public.collaboration_threads (family_user_id);

-- ── 6. Events — collaboration becomes history: timeline + Knowledge Graph feed ────────────────
create table if not exists public.collaboration_events (
  id             uuid primary key default gen_random_uuid(),
  family_user_id uuid not null references auth.users(id) on delete cascade,
  object_type    text not null,
  object_id      text not null,
  object_label   text not null,
  domain         text not null,
  space          text,
  kind           text not null
                   check (kind in ('shared','invited','accepted','declined','assigned',
                                   'commented','reviewed','completed','requested_info')),
  actor          text not null,
  target_name    text,
  summary        text not null,
  created_at     timestamptz not null default now()
);
create index if not exists collab_evt_object_idx on public.collaboration_events (object_type, object_id, created_at);
create index if not exists collab_evt_owner_idx  on public.collaboration_events (family_user_id, created_at desc);

-- ── RLS: the owner + their Presence Manager / Super Admin, on every table ─────────────────────
alter table public.trusted_identities         enable row level security;
alter table public.trusted_permissions        enable row level security;
alter table public.collaboration_invitations  enable row level security;
alter table public.collaboration_assignments  enable row level security;
alter table public.collaboration_threads      enable row level security;
alter table public.collaboration_events       enable row level security;

drop policy if exists trusted_identities_rw on public.trusted_identities;
create policy trusted_identities_rw on public.trusted_identities for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

drop policy if exists trusted_permissions_rw on public.trusted_permissions;
create policy trusted_permissions_rw on public.trusted_permissions for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

drop policy if exists collab_invitations_rw on public.collaboration_invitations;
create policy collab_invitations_rw on public.collaboration_invitations for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

drop policy if exists collab_assignments_rw on public.collaboration_assignments;
create policy collab_assignments_rw on public.collaboration_assignments for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

drop policy if exists collab_threads_rw on public.collaboration_threads;
create policy collab_threads_rw on public.collaboration_threads for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

drop policy if exists collab_events_rw on public.collaboration_events;
create policy collab_events_rw on public.collaboration_events for all
  using (public.owns_or_manages_family(family_user_id))
  with check (public.owns_or_manages_family(family_user_id));

-- ── grants ───────────────────────────────────────────────────────────────────────────────────
revoke all on public.trusted_identities        from authenticated;
revoke all on public.trusted_permissions       from authenticated;
revoke all on public.collaboration_invitations from authenticated;
revoke all on public.collaboration_assignments from authenticated;
revoke all on public.collaboration_threads     from authenticated;
revoke all on public.collaboration_events      from authenticated;

grant select, insert, update, delete on public.trusted_identities        to authenticated;
grant select, insert, update, delete on public.trusted_permissions       to authenticated;
grant select, insert, update, delete on public.collaboration_invitations to authenticated;
grant select, insert, update, delete on public.collaboration_assignments to authenticated;
grant select, insert, update, delete on public.collaboration_threads     to authenticated;
grant select, insert, update, delete on public.collaboration_events      to authenticated;
