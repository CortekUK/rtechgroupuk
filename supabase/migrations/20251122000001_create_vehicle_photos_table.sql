-- Create vehicle_photos table for storing multiple photos per vehicle
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster vehicle photo lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id ON vehicle_photos(vehicle_id);

-- Enable RLS
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read vehicle photos
CREATE POLICY "Allow authenticated users to read vehicle photos"
  ON vehicle_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert vehicle photos
CREATE POLICY "Allow authenticated users to insert vehicle photos"
  ON vehicle_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update vehicle photos
CREATE POLICY "Allow authenticated users to update vehicle photos"
  ON vehicle_photos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policy for authenticated users to delete vehicle photos
CREATE POLICY "Allow authenticated users to delete vehicle photos"
  ON vehicle_photos
  FOR DELETE
  TO authenticated
  USING (true);

-- Migrate existing photo_url from vehicles table to vehicle_photos
INSERT INTO vehicle_photos (vehicle_id, photo_url, is_primary, display_order)
SELECT id, photo_url, true, 0
FROM vehicles
WHERE photo_url IS NOT NULL;
