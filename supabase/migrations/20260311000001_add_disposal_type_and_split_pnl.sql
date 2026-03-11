-- Add disposal_type column to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS disposal_type text DEFAULT 'Sale';

-- Update dispose_vehicle to accept disposal_type and create two P&L entries
CREATE OR REPLACE FUNCTION public.dispose_vehicle(
  p_vehicle_id uuid,
  p_disposal_date date,
  p_sale_proceeds numeric,
  p_buyer text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_disposal_type text DEFAULT 'Sale'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_book_cost numeric;
  v_gain_loss numeric;
  v_ref_revenue text;
  v_ref_cost text;
BEGIN
  -- Calculate book cost
  v_book_cost := calculate_vehicle_book_cost(p_vehicle_id);

  -- Calculate gain/loss for event summary
  v_gain_loss := p_sale_proceeds - v_book_cost;

  -- Reference keys for the two P&L entries
  v_ref_revenue := 'dispose_revenue:' || p_vehicle_id::text;
  v_ref_cost := 'dispose_cost:' || p_vehicle_id::text;

  -- Idempotency: delete any existing disposal P&L entries
  DELETE FROM pnl_entries WHERE reference IN (v_ref_revenue, v_ref_cost);
  -- Also delete legacy single-entry format
  DELETE FROM pnl_entries WHERE reference = 'dispose:' || p_vehicle_id::text;

  -- Update vehicle with disposal info
  UPDATE vehicles
  SET is_disposed = true,
      disposal_date = p_disposal_date,
      sale_proceeds = p_sale_proceeds,
      disposal_buyer = p_buyer,
      disposal_notes = p_notes,
      disposal_type = p_disposal_type,
      status = 'Disposed'
  WHERE id = p_vehicle_id;

  -- Insert Revenue P&L entry (sale proceeds)
  IF p_sale_proceeds > 0 THEN
    INSERT INTO pnl_entries (vehicle_id, entry_date, side, category, amount, reference)
    VALUES (p_vehicle_id, p_disposal_date, 'Revenue', 'Disposal', p_sale_proceeds, v_ref_revenue);
  END IF;

  -- Insert Cost P&L entry (book cost)
  IF v_book_cost > 0 THEN
    INSERT INTO pnl_entries (vehicle_id, entry_date, side, category, amount, reference)
    VALUES (p_vehicle_id, p_disposal_date, 'Cost', 'Disposal', v_book_cost, v_ref_cost);
  END IF;

  -- Add vehicle event
  INSERT INTO vehicle_events (vehicle_id, event_type, summary, event_date)
  VALUES (
    p_vehicle_id,
    'disposal',
    'Vehicle ' || p_disposal_type || ' for £' || p_sale_proceeds ||
    CASE WHEN v_gain_loss > 0 THEN ' (Gain: £' || v_gain_loss || ')'
         WHEN v_gain_loss < 0 THEN ' (Loss: £' || ABS(v_gain_loss) || ')'
         ELSE ' (Break-even)'
    END,
    p_disposal_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'book_cost', v_book_cost,
    'sale_proceeds', p_sale_proceeds,
    'gain_loss', v_gain_loss
  );
END;
$$;

-- Update undo_vehicle_disposal to delete both P&L entries and clear disposal_type
CREATE OR REPLACE FUNCTION public.undo_vehicle_disposal(p_vehicle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Remove disposal info from vehicle
  UPDATE vehicles
  SET is_disposed = false,
      disposal_date = NULL,
      sale_proceeds = NULL,
      disposal_buyer = NULL,
      disposal_notes = NULL,
      disposal_type = NULL,
      status = 'Available'
  WHERE id = p_vehicle_id;

  -- Remove all disposal P&L entries (both new split format and legacy)
  DELETE FROM pnl_entries
  WHERE reference LIKE 'dispose_%:' || p_vehicle_id::text
     OR reference = 'dispose:' || p_vehicle_id::text;

  -- Add reversal event
  INSERT INTO vehicle_events (vehicle_id, event_type, summary)
  VALUES (p_vehicle_id, 'disposal', 'Disposal reversed - vehicle returned to available');

  RETURN jsonb_build_object('success', true);
END;
$$;
