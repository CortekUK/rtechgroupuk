-- Create vehicle-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Update documents bucket to be public if it exists
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow vehicle photo uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow vehicle photo reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow vehicle photo updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow vehicle photo deletes" ON storage.objects;

-- Allow anyone to upload to documents bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents');

-- Allow anyone to read from documents bucket
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

-- Allow anyone to update in documents bucket
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents');

-- Allow anyone to delete from documents bucket
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents');

-- Allow anyone to upload to vehicle-photos bucket
CREATE POLICY "Allow vehicle photo uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'vehicle-photos');

-- Allow anyone to read from vehicle-photos bucket
CREATE POLICY "Allow vehicle photo reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vehicle-photos');

-- Allow anyone to update in vehicle-photos bucket
CREATE POLICY "Allow vehicle photo updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'vehicle-photos');

-- Allow anyone to delete from vehicle-photos bucket
CREATE POLICY "Allow vehicle photo deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'vehicle-photos');
