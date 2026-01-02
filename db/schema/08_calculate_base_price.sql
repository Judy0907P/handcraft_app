BEGIN;

---------------------------------------------------------------------
-- 8) Total Cost Calculation
-- Automatically calculate product total_cost from recipe parts cost
---------------------------------------------------------------------

-- Function to calculate unit cost for a part based on most recent purchases
-- Uses FIFO-like approach: takes from most recent purchases until required quantity is met
CREATE OR REPLACE FUNCTION calculate_part_unit_cost_from_recent_purchases(
  p_part_id UUID,
  p_required_qty NUMERIC
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_cost NUMERIC(10,2) := 0;
  v_total_qty NUMERIC(10,4) := 0;
  v_remaining_qty NUMERIC(10,4);
  v_txn_qty INT;
  v_txn_price NUMERIC(10,2);
  v_qty_to_take NUMERIC(10,4);
BEGIN
  -- If no quantity needed, return 0
  IF p_required_qty <= 0 THEN
    RETURN 0;
  END IF;
  
  v_remaining_qty := p_required_qty;
  
  -- Loop through purchase transactions ordered by most recent first
  -- Only consider 'purchase' transactions with positive qty
  FOR v_txn_qty, v_txn_price IN
    SELECT ABS(qty)::INT, unit_price_for_purchase
    FROM part_transactions
    WHERE part_id = p_part_id
      AND txn_type = 'purchase'
      AND qty > 0
    ORDER BY created_at DESC
  LOOP
    -- If we've collected enough, break
    IF v_remaining_qty <= 0 THEN
      EXIT;
    END IF;
    
    -- Take as much as needed from this transaction (or all if less than needed)
    v_qty_to_take := LEAST(v_remaining_qty, v_txn_qty::NUMERIC);
    
    -- Add to totals
    v_total_cost := v_total_cost + (v_qty_to_take * v_txn_price);
    v_total_qty := v_total_qty + v_qty_to_take;
    v_remaining_qty := v_remaining_qty - v_qty_to_take;
  END LOOP;
  
  -- If we don't have enough purchase history, use current part unit_cost for remaining
  IF v_remaining_qty > 0 THEN
    DECLARE
      v_current_cost NUMERIC(10,2);
    BEGIN
      SELECT unit_cost INTO v_current_cost
      FROM parts
      WHERE part_id = p_part_id;
      
      v_total_cost := v_total_cost + (v_remaining_qty * COALESCE(v_current_cost, 0));
      v_total_qty := v_total_qty + v_remaining_qty;
    END;
  END IF;
  
  -- Calculate average unit cost
  IF v_total_qty > 0 THEN
    RETURN v_total_cost / v_total_qty;
  ELSE
    -- Fallback to current part cost if no purchase history
    SELECT COALESCE(unit_cost, 0) INTO v_total_cost
    FROM parts
    WHERE part_id = p_part_id;
    
    RETURN v_total_cost;
  END IF;
END;
$$;

-- Function to calculate total_cost from recipe
-- Uses FIFO-like approach: for each part, uses cost from most recent purchases
CREATE OR REPLACE FUNCTION calculate_product_total_cost(p_product_id UUID)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_cost NUMERIC(10,2) := 0;
  v_recipe_line RECORD;
  v_part_unit_cost NUMERIC(10,2);
BEGIN
  -- For each recipe line, calculate cost based on most recent purchases
  FOR v_recipe_line IN
    SELECT rl.part_id, rl.quantity
    FROM recipe_lines rl
    WHERE rl.product_id = p_product_id
  LOOP
    -- Calculate unit cost for this part based on most recent purchases
    v_part_unit_cost := calculate_part_unit_cost_from_recent_purchases(
      v_recipe_line.part_id,
      v_recipe_line.quantity
    );
    
    -- Add to total cost: recipe_quantity * unit_cost
    v_total_cost := v_total_cost + (v_recipe_line.quantity * v_part_unit_cost);
  END LOOP;
  
  RETURN COALESCE(v_total_cost, 0);
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

-- Function to update total_cost for all products using a specific part
CREATE OR REPLACE FUNCTION update_products_using_part()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_part_id UUID;
BEGIN
  -- Get part_id from the trigger context
  IF TG_OP = 'DELETE' THEN
    v_part_id := OLD.part_id;
  ELSE
    v_part_id := NEW.part_id;
  END IF;
  
  -- Only update if unit_cost actually changed
  IF TG_OP = 'UPDATE' AND OLD.unit_cost = NEW.unit_cost THEN
    RETURN NEW;
  END IF;
  
  -- Update total_cost for all products that use this part
  UPDATE products
  SET total_cost = calculate_product_total_cost(product_id),
      updated_at = now()
  WHERE product_id IN (
    SELECT DISTINCT product_id
    FROM recipe_lines
    WHERE part_id = v_part_id
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update total_cost for all products using parts from a transaction
CREATE OR REPLACE FUNCTION update_products_using_part_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_part_id UUID;
BEGIN
  -- Get part_id from the trigger context
  IF TG_OP = 'DELETE' THEN
    v_part_id := OLD.part_id;
    
    -- Only update if this was a purchase transaction
    IF OLD.txn_type != 'purchase' THEN
      RETURN OLD;
    END IF;
  ELSE
    v_part_id := NEW.part_id;
    
    -- Only update if this is a purchase transaction
    IF NEW.txn_type != 'purchase' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;
  
  -- Update total_cost for all products that use this part
  UPDATE products
  SET total_cost = calculate_product_total_cost(product_id),
      updated_at = now()
  WHERE product_id IN (
    SELECT DISTINCT product_id
    FROM recipe_lines
    WHERE part_id = v_part_id
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update product total_cost when part purchase transactions change
DROP TRIGGER IF EXISTS trigger_update_products_on_part_transaction ON part_transactions;

CREATE TRIGGER trigger_update_products_on_part_transaction
  AFTER INSERT OR UPDATE OR DELETE ON part_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_products_using_part_from_transaction();

-- Keep the trigger on parts table for backward compatibility
-- (though it's less critical now since we use transactions, but still useful if part.unit_cost is manually set)
DROP TRIGGER IF EXISTS trigger_update_products_on_part_cost_change ON parts;

CREATE TRIGGER trigger_update_products_on_part_cost_change
  AFTER UPDATE OF unit_cost ON parts
  FOR EACH ROW
  WHEN (OLD.unit_cost IS DISTINCT FROM NEW.unit_cost)
  EXECUTE FUNCTION update_products_using_part();

COMMIT;

