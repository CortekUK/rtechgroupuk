-- Add missing fields to rentals table
ALTER TABLE public.rentals
ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_included BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_fee_received BOOLEAN DEFAULT false;

-- Add missing fields to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS variant TEXT;

-- Add comment to clarify the monthly_payment column
COMMENT ON COLUMN public.rentals.monthly_payment IS 'Monthly rental payment amount (also referred to as monthly_amount in some contexts)';
