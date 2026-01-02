BEGIN;

---------------------------------------------------------------------
-- Seed Data for Testing
-- This file creates sample data for testing workflows
---------------------------------------------------------------------

-- 1. Create a test user
INSERT INTO users (user_id, email, password_hash, display_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- 2. Create a test organization
INSERT INTO organizations (org_id, name, main_currency, additional_currency, exchange_rate)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'My Handcraft Store', 'USD', 'CNY', 7.2)
ON CONFLICT DO NOTHING;

-- 3. Create org membership
INSERT INTO org_memberships (org_id, user_id, role)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'owner')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- 4. Create part types and subtypes
INSERT INTO part_types (type_id, org_id, type_name)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Beads'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'String')
ON CONFLICT DO NOTHING;

INSERT INTO part_subtypes (subtype_id, type_id, subtype_name)
VALUES 
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Glass Beads'),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Wooden Beads'),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Cotton String'),
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'Leather Cord')
ON CONFLICT DO NOTHING;

-- 5. Create parts with initial stock
INSERT INTO parts (part_id, org_id, name, stock, unit_cost, unit, subtype_id, specs, color, alert_stock, image_url, status, notes)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Blue Glass Beads', 100, 0.50, 'piece', '55555555-5555-5555-5555-555555555555', '6mm round', 'Blue', 20, NULL, ARRAY['in-stock'], 'High quality glass beads'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Red Glass Beads', 100, 0.50, 'piece', '55555555-5555-5555-5555-555555555555', '6mm round', 'Red', 20, NULL, ARRAY['in-stock'], 'High quality glass beads'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Cotton String White', 50, 2.00, 'meter', '77777777-7777-7777-7777-777777777777', '2mm diameter', 'White', 10, NULL, ARRAY['in-stock'], NULL),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Leather Cord Brown', 30, 5.00, 'meter', '88888888-8888-8888-8888-888888888888', '3mm width', 'Brown', 5, NULL, ARRAY['in-stock'], 'Premium leather cord')
ON CONFLICT (org_id, name) DO NOTHING;

-- 6. Create product types and subtypes
INSERT INTO product_types (product_type_id, org_id, name, description)
VALUES 
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Jewelry', 'Handmade jewelry items')
ON CONFLICT DO NOTHING;

INSERT INTO product_subtypes (product_subtype_id, product_type_id, name, description)
VALUES 
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Bracelet', 'Wrist jewelry'),
  ('99999999-9999-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Necklace', 'Neck jewelry')
ON CONFLICT DO NOTHING;

-- 7. Create products
INSERT INTO products (product_id, org_id, name, description, primary_color, secondary_color, product_subtype_id, status, is_self_made, difficulty, quantity, total_cost)
VALUES 
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Blue Bead Bracelet', 'Beautiful blue glass bead bracelet', 'Blue', 'White', 'ffffffff-ffff-ffff-ffff-ffffffffffff', ARRAY['active'], true, 'easy', 0, 15.00),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Red Bead Necklace', 'Elegant red glass bead necklace', 'Red', 'Brown', '99999999-9999-9999-9999-999999999999', ARRAY['active'], true, 'medium', 0, 25.00)
ON CONFLICT (org_id, name) DO NOTHING;

-- 8. Create recipe lines (BOM)
-- Blue Bead Bracelet: 10 blue beads + 0.5m cotton string
INSERT INTO recipe_lines (product_id, part_id, quantity)
VALUES 
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 0.5)
ON CONFLICT (product_id, part_id) DO NOTHING;

-- Red Bead Necklace: 20 red beads + 1m leather cord
INSERT INTO recipe_lines (product_id, part_id, quantity)
VALUES 
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 20),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1)
ON CONFLICT (product_id, part_id) DO NOTHING;

COMMIT;

