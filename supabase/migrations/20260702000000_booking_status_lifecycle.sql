-- Booking status lifecycle: history table, overdue flag, new columns
-- 2026-07-02

-- ── 1. New columns on bookings ───────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attention_needed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reschedule_time  timestamptz;

-- ── 2. booking_status_history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status      text        NOT NULL,
  changed_by  uuid        REFERENCES auth.users(id),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  note        text
);

CREATE INDEX IF NOT EXISTS idx_bsh_booking_id  ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_bsh_changed_at  ON booking_status_history(changed_at DESC);

-- ── 3. RLS for history ───────────────────────────────────────────────────────
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- Family reads history for their own bookings
CREATE POLICY "bsh_family_read" ON booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id AND b.family_user_id = auth.uid()
    )
  );

-- Companion reads history for their assigned bookings
CREATE POLICY "bsh_companion_read" ON booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id AND b.companion_id = auth.uid()
    )
  );

-- Admin reads all
CREATE POLICY "bsh_admin_read" ON booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role inserts (edge functions)
CREATE POLICY "bsh_service_insert" ON booking_status_history
  FOR INSERT WITH CHECK (true);

-- ── 4. Overdue flagging function ─────────────────────────────────────────────
-- Called by check-overdue-bookings edge function (cron every 15 min).
-- Marks bookings as needing attention when they have not progressed past
-- 'companion_assigned'/'on_the_way' within 30 min of their scheduled time.
CREATE OR REPLACE FUNCTION flag_overdue_bookings(threshold_minutes int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE flagged int;
BEGIN
  UPDATE bookings
  SET    attention_needed = true
  WHERE  status IN ('confirmed', 'companion_assigned', 'on_the_way')
    AND  scheduled_at IS NOT NULL
    AND  scheduled_at + (threshold_minutes || ' minutes')::interval < now()
    AND  NOT attention_needed;
  GET DIAGNOSTICS flagged = ROW_COUNT;
  RETURN flagged;
END;
$$;
