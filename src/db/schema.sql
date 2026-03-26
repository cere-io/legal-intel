-- Claim Intelligence Engine: Cubby-Native Schema
-- Single table design for zero-transformation DDC migration

DROP TABLE IF EXISTS cubby_versions CASCADE;
DROP TABLE IF EXISTS cubbies CASCADE;

CREATE TABLE cubbies (
  path VARCHAR(500) PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cubby_versions (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL,
  changed_by VARCHAR(200),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cubbies_path_prefix ON cubbies USING btree (path varchar_pattern_ops);
CREATE INDEX idx_cubby_versions_path ON cubby_versions (path);
