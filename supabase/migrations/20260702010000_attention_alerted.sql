-- Track whether an overdue alert has been sent for this booking,
-- so the cron job fires exactly once per overdue incident and not on every 15-min tick.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attention_alerted boolean NOT NULL DEFAULT false;
