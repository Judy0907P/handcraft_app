BEGIN;

---------------------------------------------------------------------
-- 6) Sales and Orders
-- Sales are tracked via product_transactions with txn_type='sale'
-- Orders are created from cart checkout, and record_sale is called when order status is 'closed'
---------------------------------------------------------------------

---------------------------------------------------------------------
-- Platforms table (org-scoped, user-editable)
-- Users can create/edit platforms for their organization
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platforms (
  platform_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('online', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_platforms_org_name UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_platforms_org_id ON platforms(org_id);
CREATE INDEX IF NOT EXISTS idx_platforms_channel ON platforms(channel);

---------------------------------------------------------------------
-- Orders table
-- Orders are created from cart checkout
-- Status: created (default), completed, shipped, closed, canceled
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  channel TEXT CHECK (channel IN ('online', 'offline')),
  platform_id UUID REFERENCES platforms(platform_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'shipped', 'closed', 'canceled')),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

---------------------------------------------------------------------
-- Order lines table
-- Records products, quantities, prices for each order
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_lines (
  order_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_product_id ON order_lines(product_id);

---------------------------------------------------------------------
-- create_order(org_id, user_id, channel, platform_id, notes, order_lines_json) -> returns order_id
--
-- Behavior:
--  1) Validate order lines
--  2) Calculate total_price from order lines
--  3) Lock product rows FOR UPDATE (concurrency safety)
--  4) Check sufficient inventory for all products
--  5) Reserve inventory (decrease products.quantity)
--  6) Create order and order_lines
--
-- Notes:
--  - order_lines_json should be JSON array: [{"product_id": "...", "quantity": 1, "unit_price": 10.00}, ...]
--  - Inventory is reserved when order is created (status='created')
--  - If order is canceled, inventory is restored
--  - record_sale is called when order status changes to 'closed'
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_order(
  p_org_id UUID,
  p_user_id UUID,
  p_channel TEXT,
  p_order_lines_json JSONB,
  p_platform_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_total_price NUMERIC(10,2) := 0;
  v_line JSONB;
  v_product_id UUID;
  v_quantity INT;
  v_unit_price NUMERIC(10,2);
  v_unit_cost NUMERIC(10,2);
  v_subtotal NUMERIC(10,2);
BEGIN
  -- Validate channel
  IF p_channel IS NOT NULL AND p_channel NOT IN ('online', 'offline') THEN
    RAISE EXCEPTION 'Channel must be "online" or "offline"';
  END IF;

  -- Validate order lines
  IF p_order_lines_json IS NULL OR jsonb_array_length(p_order_lines_json) = 0 THEN
    RAISE EXCEPTION 'Order must have at least one line item';
  END IF;

  -- Calculate total price and validate/check inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines_json)
  LOOP
    v_product_id := (v_line->>'product_id')::UUID;
    v_quantity := (v_line->>'quantity')::INT;
    v_unit_price := (v_line->>'unit_price')::NUMERIC;
    
    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid order line: product_id and quantity > 0 are required';
    END IF;
    
    IF v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Invalid order line: unit_price must be >= 0';
    END IF;

    -- Lock product row for update (concurrency safety)
    PERFORM 1
    FROM products
    WHERE product_id = v_product_id
      AND org_id = p_org_id
    FOR UPDATE;

    -- Check sufficient inventory
    IF NOT EXISTS (
      SELECT 1
      FROM products
      WHERE product_id = v_product_id
        AND org_id = p_org_id
        AND quantity >= v_quantity
    ) THEN
      RAISE EXCEPTION 'Insufficient product inventory for product % (qty=%)', v_product_id, v_quantity;
    END IF;

    -- Get unit cost (for order line recording)
    SELECT COALESCE(calculate_product_total_cost(v_product_id), 0) INTO v_unit_cost;
    IF v_unit_cost IS NULL OR v_unit_cost = 0 THEN
      SELECT COALESCE(total_cost, 0) INTO v_unit_cost
      FROM products
      WHERE product_id = v_product_id;
    END IF;

    v_subtotal := v_quantity * v_unit_price;
    v_total_price := v_total_price + v_subtotal;
  END LOOP;

  -- Create order
  INSERT INTO orders (org_id, user_id, channel, platform_id, status, total_price, notes)
  VALUES (p_org_id, p_user_id, p_channel, p_platform_id, 'created', v_total_price, p_notes)
  RETURNING order_id INTO v_order_id;

  -- Create order lines and reserve inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines_json)
  LOOP
    v_product_id := (v_line->>'product_id')::UUID;
    v_quantity := (v_line->>'quantity')::INT;
    v_unit_price := (v_line->>'unit_price')::NUMERIC;
    
    -- Get unit cost
    SELECT COALESCE(calculate_product_total_cost(v_product_id), 0) INTO v_unit_cost;
    IF v_unit_cost IS NULL OR v_unit_cost = 0 THEN
      SELECT COALESCE(total_cost, 0) INTO v_unit_cost
      FROM products
      WHERE product_id = v_product_id;
    END IF;

    v_subtotal := v_quantity * v_unit_price;

    -- Insert order line
    INSERT INTO order_lines (order_id, product_id, quantity, unit_cost, unit_price, subtotal)
    VALUES (v_order_id, v_product_id, v_quantity, v_unit_cost, v_unit_price, v_subtotal);

    -- Reserve inventory (decrease quantity)
    UPDATE products
    SET quantity = quantity - v_quantity,
        updated_at = now()
    WHERE product_id = v_product_id
      AND org_id = p_org_id;
  END LOOP;

  -- If channel is 'offline', automatically close the order (creates sales transactions)
  IF p_channel = 'offline' THEN
    PERFORM update_order_status(v_order_id, 'closed');
  END IF;

  RETURN v_order_id;
END;
$$;

---------------------------------------------------------------------
-- update_order_status(order_id, new_status) -> returns order_id
--
-- Behavior:
--  1) Validate status transition
--  2) Prevent any changes to orders with status 'closed'
--  3) Only allow cancellation from 'created' or 'completed' status
--  4) If new_status is 'canceled', restore inventory (increase products.quantity)
--  5) If new_status is 'closed', call record_sale for each order line
--  6) Update order status and updated_at
--
-- Notes:
--  - Only 'created' or 'completed' orders can be canceled
--  - 'closed' status triggers record_sale for each line item
--  - Inventory is restored when canceled
--  - Once an order is 'closed', no further status changes are allowed
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
  v_old_status TEXT;
  v_line RECORD;
BEGIN
  -- Validate new status
  IF p_new_status NOT IN ('created', 'completed', 'shipped', 'closed', 'canceled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Get order details
  SELECT org_id, status INTO v_org_id, v_old_status
  FROM orders
  WHERE order_id = p_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Prevent any status changes after order is closed
  IF v_old_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change status of a closed order';
  END IF;

  -- Handle status transitions
  IF p_new_status = 'canceled' THEN
    -- Only allow canceling orders from 'created' or 'completed' status
    IF v_old_status NOT IN ('created', 'completed') THEN
      RAISE EXCEPTION 'Order can only be canceled from "created" or "completed" status, current status is "%"', v_old_status;
    END IF;

    -- Restore inventory for all order lines
    FOR v_line IN SELECT product_id, quantity FROM order_lines WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET quantity = quantity + v_line.quantity,
          updated_at = now()
      WHERE product_id = v_line.product_id
        AND org_id = v_org_id;
    END LOOP;

    -- Note: Sales transactions (product_transactions) from closed orders are not deleted
    -- This preserves the historical record. If you need to track refunds, you could
    -- add a refund transaction type or add a refund flag to transactions.

  ELSIF p_new_status = 'closed' THEN
    -- Only allow closing non-canceled orders
    IF v_old_status = 'canceled' THEN
      RAISE EXCEPTION 'Cannot close a canceled order';
    END IF;

    -- Create product_transactions for each order line (only if not already closed)
    -- Note: Inventory is already reserved when order is created, so we don't decrease it again
    IF v_old_status != 'closed' THEN
      FOR v_line IN SELECT ol.product_id, ol.quantity, ol.unit_price, ol.unit_cost FROM order_lines ol WHERE ol.order_id = p_order_id
      LOOP
        -- Insert product transaction with sale type (inventory already reserved, so no quantity update)
        INSERT INTO product_transactions (org_id, txn_type, product_id, qty, unit_price_for_sale, unit_cost_at_sale, notes)
        VALUES (v_org_id, 'sale', v_line.product_id, v_line.quantity, v_line.unit_price, v_line.unit_cost, 'Order ' || p_order_id::TEXT);
      END LOOP;
    END IF;
  END IF;

  -- Update order status
  UPDATE orders
  SET status = p_new_status,
      updated_at = now()
  WHERE order_id = p_order_id;

  RETURN p_order_id;
END;
$$;

---------------------------------------------------------------------
-- return_order(order_id) -> returns order_id
--
-- Behavior:
--  1) Check order status is 'shipped'
--  2) Mark order as 'canceled'
--  3) Restore inventory (increase products.quantity)
--  4) Append "returned" to notes (same format as tracking number)
--
-- Notes:
--  - Only 'shipped' orders can be returned
--  - This is similar to canceling but specifically for shipped orders
--  - Appends "returned" to notes in the same way tracking numbers are appended
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION return_order(
  p_order_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
  v_old_status TEXT;
  v_current_notes TEXT;
  v_line RECORD;
BEGIN
  -- Get order details
  SELECT org_id, status, notes INTO v_org_id, v_old_status, v_current_notes
  FROM orders
  WHERE order_id = p_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Only allow returning shipped orders
  IF v_old_status != 'shipped' THEN
    RAISE EXCEPTION 'Order can only be returned from "shipped" status, current status is "%"', v_old_status;
  END IF;

  -- Restore inventory for all order lines
  FOR v_line IN SELECT product_id, quantity FROM order_lines WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET quantity = quantity + v_line.quantity,
        updated_at = now()
    WHERE product_id = v_line.product_id
      AND org_id = v_org_id;
  END LOOP;

  -- Append "returned" to notes (same format as tracking number)
  v_current_notes := COALESCE(v_current_notes, '');
  v_current_notes := CASE 
    WHEN v_current_notes = '' THEN 'Returned'
    ELSE v_current_notes || E'\nReturned'
  END;

  -- Update order status to canceled and append returned to notes
  UPDATE orders
  SET status = 'canceled',
      notes = v_current_notes,
      updated_at = now()
  WHERE order_id = p_order_id;

  RETURN p_order_id;
END;
$$;

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
--  - This function is called when order status changes to 'closed'
--  - Note: inventory is already reserved when order is created, but we still
--    need to check/update here for safety (in case order was created but inventory changed)
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
  v_unit_cost_at_sale NUMERIC(10,2);
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

  -- Calculate unit cost at sale time using the same FIFO logic as product cost calculation
  -- Use the calculate_product_total_cost function to get current total cost
  -- This uses FIFO logic from most recent purchases
  SELECT COALESCE(calculate_product_total_cost(p_product_id), 0) INTO v_unit_cost_at_sale;
  
  -- Convert total cost to unit cost (divide by 1 unit, not by sale quantity)
  -- The function returns total cost for 1 unit of product based on recipe
  -- If product has no recipe or cost calculation fails, use product's total_cost
  IF v_unit_cost_at_sale IS NULL OR v_unit_cost_at_sale = 0 THEN
    SELECT COALESCE(total_cost, 0) INTO v_unit_cost_at_sale
    FROM products
    WHERE product_id = p_product_id;
  END IF;

  -- Insert product transaction with sale type, unit price, and unit cost at sale
  INSERT INTO product_transactions (org_id, txn_type, product_id, qty, unit_price_for_sale, unit_cost_at_sale, notes)
  VALUES (v_org_id, 'sale', p_product_id, p_quantity, p_unit_price, v_unit_cost_at_sale, COALESCE(p_notes, 'sale'))
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
-- Cost uses unit_cost_at_sale from transactions (historical cost at time of sale)
-- This ensures profit calculations are not affected by changing market costs
---------------------------------------------------------------------
CREATE OR REPLACE VIEW product_profit_summary AS
WITH sales_summary AS (
  SELECT
    product_id,
    SUM(qty * unit_price_for_sale) AS total_revenue,
    SUM(qty * unit_cost_at_sale) AS total_cost,
    SUM(qty) AS total_sold,
    AVG(unit_price_for_sale) AS avg_selling_price,
    AVG(unit_cost_at_sale) AS avg_cost_per_unit
  FROM product_transactions
  WHERE txn_type = 'sale'
  GROUP BY product_id
)
SELECT
  p.product_id,
  p.org_id,
  p.name AS product_name,
  COALESCE(ss.total_revenue, 0) AS total_revenue,
  COALESCE(ss.total_sold, 0) AS total_sold,
  COALESCE(ss.avg_selling_price, 0) AS avg_selling_price,
  COALESCE(ss.avg_cost_per_unit, 0) AS cost_per_unit,
  COALESCE(ss.total_cost, 0) AS total_cost,
  COALESCE(ss.total_revenue, 0) - COALESCE(ss.total_cost, 0) AS total_profit
FROM products p
LEFT JOIN sales_summary ss ON ss.product_id = p.product_id;

COMMIT;

