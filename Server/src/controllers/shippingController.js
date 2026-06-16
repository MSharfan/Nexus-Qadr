import pool from "../config/db.js";
import { readSellerDocs } from "../utils/sellerStore.js";
import {
  checkServiceability,
  isShiprocketConfigured,
  localShippingEstimate,
} from "../services/shiprocketService.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const ensureProductShippingColumns = async () => {
  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3) DEFAULT 0.5,
      ADD COLUMN IF NOT EXISTS length_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS width_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS height_cm numeric(10,2) DEFAULT 5,
      ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE product_sizes
      ADD COLUMN IF NOT EXISTS price numeric(10,2),
      ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0
  `);
};

const getPickupFromSellerDocs = (sellerId) => {
  const docs = readSellerDocs(sellerId) || {};
  const pickup = docs.pickup_address && typeof docs.pickup_address === "object"
    ? docs.pickup_address
    : {};

  return {
    location: docs.shiprocket_pickup_location || pickup.location || "Primary",
    pincode: pickup.postal_code || pickup.pincode || docs.pickup_pincode || null,
    country: pickup.country || docs.pickup_country || null,
    raw: pickup,
  };
};

const isIndia = (country) => {
  const c = String(country || "").trim().toLowerCase();
  return c === "india" || c === "in";
};

const getCartSellerPackages = async (userId) => {
  const q = await pool.query(
    `
    SELECT
      p.seller_id,
      SUM(GREATEST(COALESCE(p.weight_kg, 0.5), 0.5) * ci.quantity) AS weight_kg,
      MAX(GREATEST(COALESCE(p.length_cm, 10), 1)) AS length_cm,
      MAX(GREATEST(COALESCE(p.width_cm, 10), 1)) AS width_cm,
      SUM(GREATEST(COALESCE(p.height_cm, 5), 1) * ci.quantity) AS height_cm,
      SUM(ROUND((COALESCE(ps.price, p.price) * (1 - COALESCE(NULLIF(ps.discount_percent, 0), p.discount_percent, 0) / 100.0))::numeric, 2) * ci.quantity) AS subtotal
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_sizes ps ON ps.product_id = p.id AND ps.size = ci.size
    WHERE c.user_id = $1
    GROUP BY p.seller_id
    `,
    [userId]
  );

  return q.rows.map((row) => ({
    seller_id: row.seller_id,
    weight_kg: toNumber(row.weight_kg, 0.5),
    length_cm: toNumber(row.length_cm, 10),
    width_cm: toNumber(row.width_cm, 10),
    height_cm: toNumber(row.height_cm, 5),
    subtotal: toNumber(row.subtotal, 0),
    pickup: getPickupFromSellerDocs(row.seller_id),
  }));
};

const pickBestCourier = (data) => {
  const couriers = data?.data?.available_courier_companies || data?.available_courier_companies || [];
  if (!Array.isArray(couriers) || couriers.length === 0) return null;

  return [...couriers].sort((a, b) => {
    const aCost = toNumber(a.rate ?? a.freight_charge ?? a.total_charge, Number.MAX_SAFE_INTEGER);
    const bCost = toNumber(b.rate ?? b.freight_charge ?? b.total_charge, Number.MAX_SAFE_INTEGER);
    return aCost - bCost;
  })[0];
};

export const quoteCartShipping = async (req, res) => {
  try {
    const userId = req.user.id;
    const { delivery_postcode, delivery_country, payment_method = "prepaid" } = req.body;

    if (!delivery_postcode) {
      return res.status(400).json({ message: "Delivery postcode is required" });
    }

    await ensureProductShippingColumns();

    const packages = await getCartSellerPackages(userId);
    if (packages.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const cod = payment_method === "cod";
    const quotes = [];

    for (const pkg of packages) {
      const canUseDomesticShiprocket =
        isShiprocketConfigured() &&
        pkg.pickup.pincode &&
        isIndia(pkg.pickup.country) &&
        isIndia(delivery_country);

      if (!canUseDomesticShiprocket) {
        const estimate = localShippingEstimate({ weight: pkg.weight_kg, cod });
        quotes.push({
          seller_id: pkg.seller_id,
          pickup_pincode: pkg.pickup.pincode,
          pickup_country: pkg.pickup.country,
          delivery_country,
          package: pkg,
          note: isShiprocketConfigured()
            ? "Shiprocket domestic quote is only used for India-to-India shipments in this integration."
            : "Shipping is estimated locally until a carrier is configured.",
          ...estimate,
        });
        continue;
      }

      const serviceability = await checkServiceability({
        pickup_postcode: pkg.pickup.pincode,
        delivery_postcode,
        weight: pkg.weight_kg,
        cod,
      });

      const best = pickBestCourier(serviceability);

      quotes.push({
        seller_id: pkg.seller_id,
        pickup_pincode: pkg.pickup.pincode,
        pickup_country: pkg.pickup.country,
        delivery_country,
        package: pkg,
        configured: true,
        serviceable: Boolean(best),
        courier_id: best?.courier_company_id ?? best?.id ?? null,
        courier_name: best?.courier_name ?? best?.name ?? null,
        freight_charge: toNumber(best?.freight_charge ?? best?.rate, 0),
        cod_charge: toNumber(best?.cod_charges ?? best?.cod_charge, 0),
        total_charge: toNumber(best?.rate ?? best?.freight_charge, 0) + toNumber(best?.cod_charges ?? best?.cod_charge, 0),
        estimated_delivery_days: best?.estimated_delivery_days ?? best?.etd ?? null,
      });
    }

    const total_shipping = quotes.reduce((sum, q) => sum + toNumber(q.total_charge, 0), 0);

    res.json({
      configured: isShiprocketConfigured(),
      serviceable: quotes.every((q) => q.serviceable),
      total_shipping,
      quotes,
    });
  } catch (err) {
    console.error("Shipping Quote Error:", err);
    res.status(500).json({ message: err.message || "Failed to calculate shipping" });
  }
};
