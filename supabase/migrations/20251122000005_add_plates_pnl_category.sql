-- Drop existing constraint
ALTER TABLE pnl_entries DROP CONSTRAINT IF EXISTS chk_pnl_category_valid;

-- Add new constraint with 'Plates' included
ALTER TABLE pnl_entries ADD CONSTRAINT chk_pnl_category_valid
CHECK (category = ANY (ARRAY['Initial Fees'::text, 'Rental'::text, 'Acquisition'::text, 'Finance'::text, 'Service'::text, 'Fines'::text, 'Other'::text, 'Disposal'::text, 'Plates'::text]));
