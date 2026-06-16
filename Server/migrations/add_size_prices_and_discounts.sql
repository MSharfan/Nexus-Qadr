ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;

ALTER TABLE product_sizes
  ADD COLUMN IF NOT EXISTS price numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;

UPDATE products
SET discount_percent = 0
WHERE discount_percent IS NULL;

UPDATE product_sizes
SET discount_percent = 0
WHERE discount_percent IS NULL;

CREATE INDEX IF NOT EXISTS product_sizes_product_size_idx
  ON product_sizes (product_id, size);
