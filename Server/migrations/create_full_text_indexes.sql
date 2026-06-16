-- Search infrastructure for product search.
-- Run once against the PostgreSQL database used by the server.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION products_search_vector_refresh()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_refresh_trigger ON products;

CREATE TRIGGER products_search_vector_refresh_trigger
BEFORE INSERT OR UPDATE OF title, description
ON products
FOR EACH ROW
EXECUTE FUNCTION products_search_vector_refresh();

UPDATE products
SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON products USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS products_title_trgm_idx
  ON products USING GIN (lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_description_trgm_idx
  ON products USING GIN (lower(description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS categories_name_tsvector_idx
  ON categories USING GIN (to_tsvector('english', coalesce(name, '')));

CREATE INDEX IF NOT EXISTS categories_name_trgm_idx
  ON categories USING GIN (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_categories_product_id_idx
  ON product_categories (product_id);

CREATE INDEX IF NOT EXISTS product_categories_category_id_idx
  ON product_categories (category_id);

CREATE INDEX IF NOT EXISTS product_sizes_product_id_idx
  ON product_sizes (product_id);

CREATE INDEX IF NOT EXISTS product_colors_product_id_idx
  ON product_colors (product_id);

CREATE INDEX IF NOT EXISTS product_flags_trending_idx
  ON product_flags (is_trending)
  WHERE is_trending = TRUE;
