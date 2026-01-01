BEGIN;

---------------------------------------------------------------------
-- 5) Inventory transactions + build_product() function
-- Consistent with:
--   parts.stock (INT)
--   products.quantity (INT)
--   org scoping via org_id
---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_transactions (
  txn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,

  txn_type TEXT NOT NULL CHECK (txn_type IN ('build_product', 'loss', 'sale')),

  -- optional reference to product (NULL allowed e.g. loss on parts only)
  product_id UUID REFERENCES products(product_id) ON DELETE SET NULL,

  -- qty of product for build/sale/loss
  qty NUMERIC(12,4) NOT NULL,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_org_id ON inventory_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_txn_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_txn_created_at ON inventory_transactions(created_at);

CREATE TABLE IF NOT EXISTS inventory_transaction_lines (
  txn_id UUID NOT NULL REFERENCES inventory_transactions(txn_id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,

  -- parts stock delta; consumption is negative (e.g., -2)
  qty_delta NUMERIC(12,4) NOT NULL,

  PRIMARY KEY (txn_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_lines_part_id ON inventory_transaction_lines(part_id);

---------------------------------------------------------------------
-- build_product(product_id, build_qty) -> returns txn_id
--
-- Behavior:
--  1) Validate build_qty > 0
--  2) Ensure recipe exists
--  3) Lock required parts rows FOR UPDATE
--  4) Check sufficient parts.stock
--  5) Insert transaction header + lines
--  6) Update parts.stock (decrease)
--  7) Update products.quantity (increase)
--
-- Notes:
--  - Uses org_id from products to scope the transaction
--  - Ensures parts used in recipe are in same org as product
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_product(p_product_id UUID, p_build_qty NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn_id UUID;
  v_org_id UUID;
  v_missing_recipe BOOLEAN;
BEGIN
  IF p_build_qty IS NULL OR p_build_qty <= 0 THEN
    RAISE EXCEPTION 'build qty must be > 0';
  END IF;

  -- 0) Get product org and ensure product exists
  SELECT org_id INTO v_org_id
  FROM products
  WHERE product_id = p_product_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  -- 1) Ensure recipe exists
  SELECT NOT EXISTS (
    SELECT 1 FROM recipe_lines rl WHERE rl.product_id = p_product_id
  )
  INTO v_missing_recipe;

  IF v_missing_recipe THEN
    RAISE EXCEPTION 'No recipe found for product %', p_product_id;
  END IF;

  -- 2) Lock parts rows involved in recipe (concurrency safety)
  -- Also enforce org consistency: part.org_id must match product.org_id
  PERFORM 1
  FROM parts pa
  JOIN recipe_lines rl ON rl.part_id = pa.part_id
  WHERE rl.product_id = p_product_id
    AND pa.org_id = v_org_id
  FOR UPDATE;

  -- If recipe references parts from a different org, reject explicitly
  IF EXISTS (
    SELECT 1
    FROM recipe_lines rl
    JOIN parts pa ON pa.part_id = rl.part_id
    WHERE rl.product_id = p_product_id
      AND pa.org_id <> v_org_id
  ) THEN
    RAISE EXCEPTION 'Recipe parts org mismatch for product %', p_product_id;
  END IF;

  -- 3) Check sufficient inventory (parts.stock is INT)
  -- recipe_lines.quantity is NUMERIC; stock is INT -> compare using numeric
  IF EXISTS (
    SELECT 1
    FROM recipe_lines rl
    JOIN parts pa ON pa.part_id = rl.part_id
    WHERE rl.product_id = p_product_id
      AND pa.org_id = v_org_id
      AND pa.stock::NUMERIC < (rl.quantity * p_build_qty)
  ) THEN
    RAISE EXCEPTION 'Insufficient parts inventory for product % (qty=%)', p_product_id, p_build_qty;
  END IF;

  -- 4) Insert txn header
  INSERT INTO inventory_transactions (org_id, txn_type, product_id, qty, notes)
  VALUES (v_org_id, 'build_product', p_product_id, p_build_qty, 'auto build')
  RETURNING txn_id INTO v_txn_id;

  -- 5) Insert txn lines (each part consumption)
  INSERT INTO inventory_transaction_lines (txn_id, part_id, qty_delta)
  SELECT
    v_txn_id,
    rl.part_id,
    -(rl.quantity * p_build_qty)
  FROM recipe_lines rl
  WHERE rl.product_id = p_product_id;

  -- 6) Decrease parts stock
  -- stock is INT; consumption may be fractional if recipe is fractional.
  -- If you want to allow fractional consumption, stock should be NUMERIC instead of INT.
  -- For now we round up consumption to nearest INT to avoid "0.2 stock".
  UPDATE parts pa
  SET stock = pa.stock - CEIL(rl.quantity * p_build_qty)::INT
  FROM recipe_lines rl
  WHERE rl.product_id = p_product_id
    AND rl.part_id = pa.part_id
    AND pa.org_id = v_org_id;

  -- 7) Increase finished product quantity
  UPDATE products
  SET quantity = quantity + CEIL(p_build_qty)::INT,
      updated_at = now()
  WHERE product_id = p_product_id
    AND org_id = v_org_id;

  RETURN v_txn_id;
END;
$$;

COMMIT;
