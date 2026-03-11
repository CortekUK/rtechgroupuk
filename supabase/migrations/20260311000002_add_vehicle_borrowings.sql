CREATE TABLE public.vehicle_borrowings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    borrower_name text NOT NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    purpose text,
    notes text,
    borrowed_date date NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date date,
    actual_return_date date,
    returned_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_borrowings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.vehicle_borrowings FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_vb_vehicle_id ON public.vehicle_borrowings(vehicle_id);
CREATE INDEX idx_vb_active ON public.vehicle_borrowings(vehicle_id) WHERE actual_return_date IS NULL;
