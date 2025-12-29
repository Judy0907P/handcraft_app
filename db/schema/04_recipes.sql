BEGIN;

CREATE TABLE IF NOT EXISTS recipe_lines (
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,

  quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_lines_part_id ON recipe_lines(part_id);

COMMIT;
