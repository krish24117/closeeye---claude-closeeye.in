-- Add payment link columns and expand status constraint for booking_requests

-- 1. Add payment link tracking columns
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS razorpay_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ;

-- 2. Drop old status constraint, recreate with pending_confirmation added
ALTER TABLE booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE booking_requests
  ADD CONSTRAINT booking_requests_status_check CHECK (
    status IN (
      'pending_confirmation',
      'requested',
      'needs_details',
      'confirmed',
      'scheduled',
      'companion_confirmed',
      'paid',
      'cancelled'
    )
  );

-- 3. Index for payment link webhook lookup
CREATE INDEX IF NOT EXISTS idx_booking_requests_payment_link_id
  ON booking_requests (razorpay_payment_link_id)
  WHERE razorpay_payment_link_id IS NOT NULL;
