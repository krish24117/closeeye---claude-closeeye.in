-- Migration: family_members and subscriptions tables
-- Idempotent: all statements use IF NOT EXISTS / DROP IF EXISTS

-- ─── set_updated_at trigger function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── family_members ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  email            text NOT NULL,
  whatsapp_number  text,
  notify_visits    boolean NOT NULL DEFAULT true,
  notify_sos       boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_members_user_email_unique UNIQUE (family_user_id, email)
);

CREATE INDEX IF NOT EXISTS family_members_family_user_id_idx
  ON public.family_members (family_user_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- policies (drop first to keep idempotent)
DROP POLICY IF EXISTS "manage own" ON public.family_members;
CREATE POLICY "manage own"
  ON public.family_members
  FOR ALL
  USING (family_user_id = auth.uid())
  WITH CHECK (family_user_id = auth.uid());

DROP POLICY IF EXISTS "admin read" ON public.family_members;
CREATE POLICY "admin read"
  ON public.family_members
  FOR SELECT
  USING (public.is_admin());

-- ─── subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                   text NOT NULL,
  razorpay_subscription_id  text UNIQUE,
  razorpay_customer_id      text,
  status                    text NOT NULL DEFAULT 'created',
  current_start             timestamptz,
  current_end               timestamptz,
  next_billing_at           timestamptz,
  total_paid_paise          integer NOT NULL DEFAULT 0,
  invoice_count             integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_id_check
    CHECK (plan_id IN ('companion', 'trust', 'family_os')),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN (
      'created', 'authenticated', 'active', 'paused',
      'halted', 'cancelled', 'completed', 'expired'
    ))
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- policies
DROP POLICY IF EXISTS "read own or admin" ON public.subscriptions;
CREATE POLICY "read own or admin"
  ON public.subscriptions
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert own" ON public.subscriptions;
CREATE POLICY "insert own"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update own or admin" ON public.subscriptions;
CREATE POLICY "update own or admin"
  ON public.subscriptions
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- before-update trigger for updated_at
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
