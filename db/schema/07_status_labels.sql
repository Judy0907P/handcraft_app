BEGIN;

-- Part Status Labels table
-- Stores available status labels for parts in each organization
CREATE TABLE IF NOT EXISTS part_status_labels (
  label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_part_status_labels_org_label UNIQUE (org_id, label)
);

-- Product Status Labels table
-- Stores available status labels for products in each organization
CREATE TABLE IF NOT EXISTS product_status_labels (
  label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_status_labels_org_label UNIQUE (org_id, label)
);

CREATE INDEX IF NOT EXISTS idx_part_status_labels_org_id ON part_status_labels(org_id);
CREATE INDEX IF NOT EXISTS idx_product_status_labels_org_id ON product_status_labels(org_id);

COMMIT;

