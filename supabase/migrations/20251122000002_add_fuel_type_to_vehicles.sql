-- Add fuel_type column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN vehicles.fuel_type IS 'Fuel type: Petrol, Diesel, Hybrid, Electric';
