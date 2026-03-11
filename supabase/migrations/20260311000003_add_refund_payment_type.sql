-- Add 'Refund' to the payments_payment_type_check constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
CHECK (payment_type IN ('Payment', 'InitialFee', 'Refund'));
