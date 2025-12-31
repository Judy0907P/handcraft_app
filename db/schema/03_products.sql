BEGIN;

CREATE TABLE IF NOT EXISTS product_types (
  product_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_product_types_org_name UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS product_subtypes (
  product_subtype_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID NOT NULL REFERENCES product_types(product_type_id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (product_type_id, name)
);

CREATE TABLE IF NOT EXISTS products (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  primary_color TEXT,
  secondary_color TEXT,

  -- NULL = Uncategorized
  product_subtype_id UUID REFERENCES product_subtypes(product_subtype_id) ON DELETE SET NULL,

  status TEXT[] DEFAULT '{}',
  is_self_made BOOLEAN NOT NULL,

  difficulty TEXT NOT NULL DEFAULT 'NA'
    CHECK (difficulty IN ('easy', 'medium', 'difficult', 'NA')),

  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  alert_quantity INT NOT NULL DEFAULT 0 CHECK (alert_quantity >= 0),

  base_price NUMERIC(10,2) CHECK (base_price >= 0),

  image_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_products_org_name UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_types_org_id ON product_types(org_id);
CREATE INDEX IF NOT EXISTS idx_product_subtypes_type_id ON product_subtypes(product_type_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_subtype_id ON products(product_subtype_id);

COMMIT;
