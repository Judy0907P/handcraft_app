---------------------------------------------------------------------
-- Example Queries for Testing Workflows
-- Use these queries to verify the database functionality
---------------------------------------------------------------------

-- ============================================================
-- 1. ADDING NEW PARTS
-- ============================================================

-- Option A: Add a part with categorization (recommended)
-- First, get the subtype_id you want to use (or create one if needed)
-- Example: Add a new part "Green Glass Beads" to the Glass Beads subtype

-- Step 1: Find the subtype_id (if you don't know it)
SELECT subtype_id, subtype_name, pt.type_name
FROM part_subtypes ps
JOIN part_types pt ON pt.type_id = ps.type_id
WHERE pt.org_id = '22222222-2222-2222-2222-222222222222'
  AND ps.subtype_name = 'Glass Beads';

-- Step 2: Insert the new part
INSERT INTO parts (org_id, name, stock, unit_cost, unit, subtype_id)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Green Glass Beads', 50, 0.60, 'piece', '55555555-5555-5555-5555-555555555555')
RETURNING part_id, name, stock, unit_cost;

-- Option B: Add a part without categorization (subtype_id = NULL)
INSERT INTO parts (org_id, name, stock, unit_cost, unit)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Silver Clasp', 20, 1.50, 'piece')
RETURNING part_id, name, stock, unit_cost;

-- Verify the part was added
SELECT p.part_id, p.name, p.stock, p.unit_cost, p.unit, ps.subtype_name
FROM parts p
LEFT JOIN part_subtypes ps ON ps.subtype_id = p.subtype_id
WHERE p.org_id = '22222222-2222-2222-2222-222222222222'
ORDER BY p.name;

-- ============================================================
-- 2. BUILDING A PRODUCT
-- ============================================================

-- Before building: Check current inventory
SELECT 
  p.name AS product_name,
  p.quantity AS product_stock,
  pa.name AS part_name,
  pa.stock AS part_stock,
  rl.quantity AS required_per_product,
  (pa.stock / NULLIF(rl.quantity, 0))::INT AS max_buildable
FROM products p
JOIN recipe_lines rl ON rl.product_id = p.product_id
JOIN parts pa ON pa.part_id = rl.part_id
WHERE p.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND p.org_id = '22222222-2222-2222-2222-222222222222';

-- Build 5 units of Blue Bead Bracelet
SELECT build_product('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5) AS transaction_id;

-- Verify the build:
-- Check product quantity increased
SELECT product_id, name, quantity 
FROM products 
WHERE product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Check parts stock decreased
SELECT 
  pa.part_id,
  pa.name,
  pa.stock,
  rl.quantity AS required_per_product,
  'Expected decrease: ' || (rl.quantity * 5) AS expected_decrease
FROM parts pa
JOIN recipe_lines rl ON rl.part_id = pa.part_id
WHERE rl.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY pa.name;

-- Check the transaction was recorded
SELECT 
  txn.txn_id,
  txn.txn_type,
  p.name AS product_name,
  txn.qty,
  txn.created_at
FROM inventory_transactions txn
JOIN products p ON p.product_id = txn.product_id
WHERE txn.txn_type = 'build_product'
  AND txn.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY txn.created_at DESC
LIMIT 5;

-- Check transaction lines (parts consumed)
SELECT 
  txn.txn_id,
  pa.name AS part_name,
  txl.qty_delta AS parts_consumed
FROM inventory_transactions txn
JOIN inventory_transaction_lines txl ON txl.txn_id = txn.txn_id
JOIN parts pa ON pa.part_id = txl.part_id
WHERE txn.txn_type = 'build_product'
  AND txn.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY txn.created_at DESC, pa.name
LIMIT 10;

-- ============================================================
-- 3. SELLING A PRODUCT
-- ============================================================

-- Before selling: Check product availability
SELECT 
  product_id,
  name,
  quantity AS available_stock,
  base_price
FROM products
WHERE product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND org_id = '22222222-2222-2222-2222-222222222222';

-- Sell 2 units of Blue Bead Bracelet at $18.00 each (above base price)
SELECT record_sale(
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- product_id
  2,                                        -- quantity
  18.00,                                    -- unit_price
  'Sold at craft fair'                      -- notes (optional)
) AS sale_id;

-- Verify the sale:
-- Check product quantity decreased
SELECT product_id, name, quantity 
FROM products 
WHERE product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Check the sale was recorded
SELECT 
  s.sale_id,
  p.name AS product_name,
  s.quantity,
  s.unit_price,
  s.total_revenue,
  s.sale_date,
  s.notes
FROM sales s
JOIN products p ON p.product_id = s.product_id
WHERE s.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY s.sale_date DESC
LIMIT 5;

-- Check the inventory transaction was created
SELECT 
  txn.txn_id,
  txn.txn_type,
  p.name AS product_name,
  txn.qty,
  txn.created_at
FROM inventory_transactions txn
JOIN products p ON p.product_id = txn.product_id
WHERE txn.txn_type = 'sale'
  AND txn.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY txn.created_at DESC
LIMIT 5;

-- ============================================================
-- 4. PROFIT ANALYSIS
-- ============================================================

-- View profit summary for all products
SELECT 
  product_name,
  base_price,
  total_sold,
  avg_selling_price,
  cost_per_unit,
  total_revenue,
  total_cost,
  total_profit,
  CASE 
    WHEN total_revenue > 0 
    THEN ROUND((total_profit / total_revenue * 100)::NUMERIC, 2)
    ELSE 0 
  END AS profit_margin_percent
FROM product_profit_summary
WHERE org_id = '22222222-2222-2222-2222-222222222222'
ORDER BY total_profit DESC;

-- Detailed profit breakdown for a specific product
SELECT 
  p.name AS product_name,
  p.base_price,
  COUNT(s.sale_id) AS number_of_sales,
  COALESCE(SUM(s.quantity), 0) AS total_units_sold,
  COALESCE(SUM(s.total_revenue), 0) AS total_revenue,
  COALESCE(AVG(s.unit_price), 0) AS avg_selling_price,
  -- Calculate cost per unit from recipe
  (
    SELECT SUM(rl.quantity * pa.unit_cost)
    FROM recipe_lines rl
    JOIN parts pa ON pa.part_id = rl.part_id
    WHERE rl.product_id = p.product_id
  ) AS cost_per_unit,
  -- Total cost
  (
    SELECT SUM(rl.quantity * pa.unit_cost)
    FROM recipe_lines rl
    JOIN parts pa ON pa.part_id = rl.part_id
    WHERE rl.product_id = p.product_id
  ) * COALESCE(SUM(s.quantity), 0) AS total_cost,
  -- Profit
  COALESCE(SUM(s.total_revenue), 0) - (
    SELECT SUM(rl.quantity * pa.unit_cost)
    FROM recipe_lines rl
    JOIN parts pa ON pa.part_id = rl.part_id
    WHERE rl.product_id = p.product_id
  ) * COALESCE(SUM(s.quantity), 0) AS total_profit
FROM products p
LEFT JOIN sales s ON s.product_id = p.product_id
WHERE p.product_id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.product_id, p.name, p.base_price;

-- ============================================================
-- 5. INVENTORY STATUS QUERIES
-- ============================================================

-- Check all parts inventory
SELECT 
  p.name,
  p.stock,
  p.unit_cost,
  p.unit,
  ps.subtype_name,
  pt.type_name,
  (p.stock * p.unit_cost) AS total_value
FROM parts p
LEFT JOIN part_subtypes ps ON ps.subtype_id = p.subtype_id
LEFT JOIN part_types pt ON pt.type_id = ps.type_id
WHERE p.org_id = '22222222-2222-2222-2222-222222222222'
ORDER BY pt.type_name, ps.subtype_name, p.name;

-- Check all products inventory
SELECT 
  p.name,
  p.quantity AS stock,
  p.base_price,
  p.alert_quantity,
  CASE 
    WHEN p.quantity <= p.alert_quantity THEN 'LOW STOCK'
    ELSE 'OK'
  END AS stock_status
FROM products p
WHERE p.org_id = '22222222-2222-2222-2222-222222222222'
ORDER BY p.name;

-- Check which products can be built with current parts inventory
SELECT 
  p.name AS product_name,
  p.quantity AS current_stock,
  MIN(
    CASE 
      WHEN rl.quantity > 0 
      THEN (pa.stock / rl.quantity)::INT
      ELSE 0
    END
  ) AS max_buildable
FROM products p
JOIN recipe_lines rl ON rl.product_id = p.product_id
JOIN parts pa ON pa.part_id = rl.part_id
WHERE p.org_id = '22222222-2222-2222-2222-222222222222'
  AND p.is_active = true
GROUP BY p.product_id, p.name, p.quantity
HAVING MIN(
  CASE 
    WHEN rl.quantity > 0 
    THEN (pa.stock / rl.quantity)::INT
    ELSE 0
  END
) > 0
ORDER BY max_buildable DESC;

