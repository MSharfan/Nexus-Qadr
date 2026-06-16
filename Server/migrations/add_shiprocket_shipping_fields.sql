ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS length_cm numeric(10,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS width_cm numeric(10,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2) DEFAULT 5;

ALTER TABLE delivery_tracking
  ADD COLUMN IF NOT EXISTS shiprocket_order_id text,
  ADD COLUMN IF NOT EXISTS shiprocket_shipment_id text,
  ADD COLUMN IF NOT EXISTS shiprocket_courier_id text,
  ADD COLUMN IF NOT EXISTS pickup_status text,
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS invoice_url text,
  ADD COLUMN IF NOT EXISTS manifest_url text;
