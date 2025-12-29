BEGIN;

CREATE TABLE IF NOT EXISTS part_types (
  type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_part_types_org_type_name UNIQUE (org_id, type_name)
);

CREATE TABLE IF NOT EXISTS part_subtypes (
  subtype_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES part_types(type_id) ON DELETE CASCADE,
  subtype_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_part_subtypes_type_subtype_name UNIQUE (type_id, subtype_name)
);

CREATE TABLE IF NOT EXISTS parts (
  part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  unit TEXT,

  -- NULL = Uncategorized
  subtype_id UUID REFERENCES part_subtypes(subtype_id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_parts_org_name UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_part_types_org_id ON part_types(org_id);
CREATE INDEX IF NOT EXISTS idx_part_subtypes_type_id ON part_subtypes(type_id);
CREATE INDEX IF NOT EXISTS idx_parts_org_id ON parts(org_id);
CREATE INDEX IF NOT EXISTS idx_parts_subtype_id ON parts(subtype_id);

COMMIT;
