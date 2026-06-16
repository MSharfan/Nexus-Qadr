-- Migration: add nullable `size` and `color` columns to order_items
-- Created: 2026-06-01
-- Purpose: ensure future orders persist selected size/color attributes and make them queryable.

-- NOTES:
-- 1) This migration uses PostgreSQL's IF NOT EXISTS to avoid errors on repeated runs.
-- 2) Columns are added as nullable (no NOT NULL) so this is a safe, non-destructive schema change.
-- 3) Optional backfill examples are included below as commented SQL. Inspect them and enable if they match
--    your current schema (they make assumptions about column names/types in `orders` or `order_items`).

BEGIN;

-- Add columns if missing
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS size varchar(255),
  ADD COLUMN IF NOT EXISTS color varchar(255);

-- Optional: create indexes if you will query by these columns frequently (uncomment to enable)
-- CREATE INDEX IF NOT EXISTS idx_order_items_size ON order_items(size);
-- CREATE INDEX IF NOT EXISTS idx_order_items_color ON order_items(color);

-- Optional backfill examples (commented out):
-- Example A: if your `order_items` already contain a json/jsonb `meta` or `attributes` column with keys 'size' and 'color',
-- you can extract and populate the new columns like this:
-- UPDATE order_items
-- SET size = (meta->> 'size')::text
-- WHERE size IS NULL AND meta ? 'size';

-- Example B: if you store an items array in the `orders` table (jsonb) and need to copy attributes into order_items,
-- you'll need a deterministic join key (for example order_id + product_id + quantity + line index). This example is
-- intentionally conservative and must be adapted to your schema before running.
--
-- WITH exploded AS (
--   SELECT
--     o.id AS order_id,
--     (item->>'product_id')::bigint AS product_id,
--     (item->>'size') AS item_size,
--     (item->>'color') AS item_color,
--     (item->>'quantity')::int AS item_qty,
--     ord_index
--   FROM orders o,
--   LATERAL (
--     SELECT item, ord_index
--     FROM jsonb_array_elements(o.items) WITH ORDINALITY arr(item, ord_index)
--   ) t
-- )
-- UPDATE order_items oi
-- SET size = e.item_size,
--     color = e.item_color
-- FROM exploded e
-- WHERE oi.order_id = e.order_id
--   AND oi.product_id = e.product_id
--   -- Add any additional matching predicates that make this reliable in your schema
--   AND oi.size IS NULL;

COMMIT;

-- End of migration
