-- Add rental price columns to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS daily_rate INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS weekly_rate INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_rate INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN vehicles.daily_rate IS 'Daily rental rate in GBP';
COMMENT ON COLUMN vehicles.weekly_rate IS 'Weekly rental rate in GBP';
COMMENT ON COLUMN vehicles.monthly_rate IS 'Monthly rental rate in GBP';
