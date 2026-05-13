-- Add structured address fields to customers table

ALTER TABLE customers
ADD COLUMN address_line1 TEXT,
ADD COLUMN address_line2 TEXT,
ADD COLUMN city TEXT,
ADD COLUMN postcode TEXT,
ADD COLUMN country TEXT DEFAULT 'United Kingdom';

COMMENT ON COLUMN customers.address_line1 IS 'Primary address line (street number and name)';
COMMENT ON COLUMN customers.address_line2 IS 'Secondary address line (apartment, suite, etc.)';
COMMENT ON COLUMN customers.city IS 'City or town';
COMMENT ON COLUMN customers.postcode IS 'Postal/ZIP code';
COMMENT ON COLUMN customers.country IS 'Country (defaults to United Kingdom)';
