BEGIN;

---------------------------------------------------------------------
-- 8) Total Cost Calculation
-- Automatically calculate product total_cost from recipe parts cost
---------------------------------------------------------------------

-- Function to calculate total_cost from recipe
CREATE OR REPLACE FUNCTION calculate_product_total_cost(p_product_id UUID)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_cost NUMERIC(10,2);
BEGIN
  -- Calculate total cost from recipe parts
  SELECT COALESCE(SUM(rl.quantity * pa.unit_cost), 0)
  INTO v_total_cost
  FROM recipe_lines rl
  JOIN parts pa ON pa.part_id = rl.part_id
  WHERE rl.product_id = p_product_id;
  
  RETURN v_total_cost;
END;
$$;

-- Function to update total_cost for a product
CREATE OR REPLACE FUNCTION update_product_total_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Get product_id from the trigger context
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;
  
  -- Update total_cost for the product
  UPDATE products
  SET total_cost = calculate_product_total_cost(v_product_id),
      updated_at = now()
  WHERE product_id = v_product_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update total_cost when recipe_lines change
DROP TRIGGER IF EXISTS trigger_update_product_total_cost ON recipe_lines;

CREATE TRIGGER trigger_update_product_total_cost
  AFTER INSERT OR UPDATE OR DELETE ON recipe_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_product_total_cost();

COMMIT;

