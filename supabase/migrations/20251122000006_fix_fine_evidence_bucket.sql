-- Make fine-evidence bucket public
UPDATE storage.buckets SET public = true WHERE id = 'fine-evidence';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads fine-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads fine-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates fine-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes fine-evidence" ON storage.objects;

-- Allow anyone to upload to fine-evidence bucket
CREATE POLICY "Allow public uploads fine-evidence"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'fine-evidence');

-- Allow anyone to read from fine-evidence bucket
CREATE POLICY "Allow public reads fine-evidence"
ON storage.objects
FOR SELECT
USING (bucket_id = 'fine-evidence');

-- Allow anyone to update in fine-evidence bucket
CREATE POLICY "Allow public updates fine-evidence"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'fine-evidence');

-- Allow anyone to delete from fine-evidence bucket
CREATE POLICY "Allow public deletes fine-evidence"
ON storage.objects
FOR DELETE
USING (bucket_id = 'fine-evidence');
