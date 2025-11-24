-- Create invoices table for storing rental invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Invoice dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Customer details (snapshot at time of invoice)
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,

  -- Vehicle details (snapshot)
  vehicle_reg TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,

  -- Rental period
  rental_start_date DATE,
  rental_end_date DATE,

  -- Line items stored as JSON
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Amounts
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_rental_id ON invoices(rental_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read invoices"
  ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert invoices"
  ON invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update invoices"
  ON invoices FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete invoices"
  ON invoices FOR DELETE TO authenticated USING (true);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');

  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';

  invoice_num := 'INV-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;
