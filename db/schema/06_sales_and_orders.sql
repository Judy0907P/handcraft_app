BEGIN;

---------------------------------------------------------------------
-- 6) Sales and Orders
-- Sales are tracked via product_transactions with txn_type='sale'
-- All sales use product_transactions directly
---------------------------------------------------------------------

---------------------------------------------------------------------
-- record_sale(product_id, quantity, unit_price, notes) -> returns txn_id
--
-- Behavior:
--  1) Validate quantity > 0 and unit_price >= 0
--  2) Ensure product exists and has sufficient quantity
--  3) Lock product row FOR UPDATE (concurrency safety)
--  4) Check sufficient products.quantity
--  5) Insert product_transaction (type='sale') with unit_price_for_sale
--  6) Update products.quantity (decrease)
--
-- Notes:
--  - Uses org_id from products to scope the transaction
--  - Returns product_transaction.txn_id (not sale_id)
--  - Sales are now tracked directly in product_transactions
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_sale(
  p_product_id UUID,
  p_quantity INT,
  p_unit_price NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn_id UUID;
  v_org_id UUID;
BEGIN
  -- Validate inputs
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Sale quantity must be > 0';
  END IF;
  
  IF p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Unit price must be >= 0';
  END IF;

  -- Get product org and ensure product exists
  SELECT org_id INTO v_org_id
  FROM products
  WHERE product_id = p_product_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  -- Lock product row for update (concurrency safety)
  PERFORM 1
  FROM products
  WHERE product_id = p_product_id
    AND org_id = v_org_id
  FOR UPDATE;

  -- Check sufficient inventory
  IF NOT EXISTS (
    SELECT 1
    FROM products
    WHERE product_id = p_product_id
      AND org_id = v_org_id
      AND quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient product inventory for product % (qty=%)', p_product_id, p_quantity;
  END IF;

  -- Insert product transaction with sale type and unit price
  INSERT INTO product_transactions (org_id, txn_type, product_id, qty, unit_price_for_sale, notes)
  VALUES (v_org_id, 'sale', p_product_id, p_quantity, p_unit_price, COALESCE(p_notes, 'sale'))
  RETURNING txn_id INTO v_txn_id;

  -- Decrease product quantity
  UPDATE products
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND org_id = v_org_id;

  RETURN v_txn_id;
END;
$$;

---------------------------------------------------------------------
-- View: product_profit_summary
-- Shows revenue, cost, and profit per product
-- Revenue from product_transactions (txn_type='sale')
-- Cost is calculated from recipe (parts cost)
---------------------------------------------------------------------
CREATE OR REPLACE VIEW product_profit_summary AS
WITH sales_summary AS (
  SELECT
    product_id,
    SUM(qty * unit_price_for_sale) AS total_revenue,
    SUM(qty) AS total_sold,
    AVG(unit_price_for_sale) AS avg_selling_price
  FROM product_transactions
  WHERE txn_type = 'sale'
  GROUP BY product_id
),
product_costs AS (
  SELECT
    rl.product_id,
    SUM(rl.quantity * pa.unit_cost) AS cost_per_unit
  FROM recipe_lines rl
  JOIN parts pa ON pa.part_id = rl.part_id
  JOIN products p ON p.product_id = rl.product_id
  WHERE pa.org_id = p.org_id
  GROUP BY rl.product_id
)
SELECT
  p.product_id,
  p.org_id,
  p.name AS product_name,
  COALESCE(ss.total_revenue, 0) AS total_revenue,
  COALESCE(ss.total_sold, 0) AS total_sold,
  COALESCE(ss.avg_selling_price, 0) AS avg_selling_price,
  COALESCE(pc.cost_per_unit, 0) AS cost_per_unit,
  COALESCE(pc.cost_per_unit * ss.total_sold, 0) AS total_cost,
  COALESCE(ss.total_revenue, 0) - COALESCE(pc.cost_per_unit * ss.total_sold, 0) AS total_profit
FROM products p
LEFT JOIN sales_summary ss ON ss.product_id = p.product_id
LEFT JOIN product_costs pc ON pc.product_id = p.product_id;

COMMIT;

