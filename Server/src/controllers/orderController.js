// Server/src/controllers/orderController.js
import pool from "../config/db.js";
import { readSellerDocs } from "../utils/sellerStore.js";
import {
  assignAwb,
  createAdhocOrder,
  generatePickup,
  isShiprocketConfigured,
} from "../services/shiprocketService.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const ensureProductShippingColumns = async (clientOrPool = pool) => {
  await clientOrPool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3) DEFAULT 0.5,
      ADD COLUMN IF NOT EXISTS length_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS width_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS height_cm numeric(10,2) DEFAULT 5
  `);
};

const ensureShiprocketTrackingColumns = async () => {
  await pool.query(`
    ALTER TABLE delivery_tracking
      ADD COLUMN IF NOT EXISTS shiprocket_order_id text,
      ADD COLUMN IF NOT EXISTS shiprocket_shipment_id text,
      ADD COLUMN IF NOT EXISTS shiprocket_courier_id text,
      ADD COLUMN IF NOT EXISTS pickup_status text,
      ADD COLUMN IF NOT EXISTS label_url text,
      ADD COLUMN IF NOT EXISTS invoice_url text,
      ADD COLUMN IF NOT EXISTS manifest_url text
  `);
};

const getSellerPickup = (sellerId) => {
  const docs = readSellerDocs(sellerId) || {};
  const pickup = docs.pickup_address && typeof docs.pickup_address === "object"
    ? docs.pickup_address
    : {};

  return {
    location: docs.shiprocket_pickup_location || pickup.location || "Primary",
    pincode: pickup.postal_code || pickup.pincode || docs.pickup_pincode || null,
    country: pickup.country || docs.pickup_country || null,
  };
};

const isIndia = (country) => {
  const c = String(country || "").trim().toLowerCase();
  return c === "india" || c === "in";
};

const buildShiprocketOrderPayload = ({ orderId, sellerId, address, paymentMethod, items, quote }) => {
  const pickup = getSellerPickup(sellerId);
  const weight = Math.max(
    items.reduce((sum, item) => sum + toNumber(item.weight_kg, 0.5) * toNumber(item.quantity, 1), 0),
    0.5
  );
  const length = Math.max(...items.map((item) => toNumber(item.length_cm, 10)), 10);
  const width = Math.max(...items.map((item) => toNumber(item.width_cm, 10)), 10);
  const height = Math.max(
    items.reduce((sum, item) => sum + toNumber(item.height_cm, 5) * toNumber(item.quantity, 1), 0),
    5
  );
  const subtotal = items.reduce(
    (sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1),
    0
  );

  return {
    payload: {
      order_id: `${orderId}-${String(sellerId).slice(0, 8)}`,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: pickup.location,
      billing_customer_name: address.full_name || "Customer",
      billing_last_name: "",
      billing_address: address.line1,
      billing_address_2: address.line2 || "",
      billing_city: address.city,
      billing_pincode: address.postal_code,
      billing_state: address.state || "",
      billing_country: address.country || "",
      billing_email: address.email || "customer@example.com",
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: items.map((item) => ({
        name: item.title || `Product ${item.product_id}`,
        sku: String(item.product_id),
        units: Number(item.quantity),
        selling_price: toNumber(item.price, 0),
      })),
      payment_method: paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: Number(subtotal.toFixed(2)),
      length,
      breadth: width,
      height,
      weight,
    },
    quote,
  };
};

const createShiprocketShipmentsForOrder = async ({
  orderId,
  userId,
  addressId,
  paymentMethod,
  cartItems,
  shippingQuote,
}) => {
  if (!isShiprocketConfigured()) return [];

  try {
    await ensureShiprocketTrackingColumns();

    const addressQ = await pool.query(
      `SELECT a.*, u.email
       FROM addresses a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [addressId, userId]
    );

    if (addressQ.rowCount === 0) return [];

    const bySeller = new Map();
    for (const item of cartItems) {
      const list = bySeller.get(item.seller_id) || [];
      list.push(item);
      bySeller.set(item.seller_id, list);
    }

    const quoteBySeller = new Map(
      Array.isArray(shippingQuote?.quotes)
        ? shippingQuote.quotes.map((q) => [String(q.seller_id), q])
        : []
    );

    const results = [];

    for (const [sellerId, items] of bySeller.entries()) {
      const pickup = getSellerPickup(sellerId);
      const destination = addressQ.rows[0];

      if (!isIndia(pickup.country) || !isIndia(destination.country)) {
        results.push({
          seller_id: sellerId,
          skipped: true,
          reason: "Current Shiprocket shipment creation is configured only for India-to-India orders.",
        });
        continue;
      }

      const quote = quoteBySeller.get(String(sellerId)) || null;
      const { payload } = buildShiprocketOrderPayload({
        orderId,
        sellerId,
        address: destination,
        paymentMethod,
        items,
        quote,
      });

      const srOrder = await createAdhocOrder(payload);
      const shiprocketOrderId = srOrder?.order_id ?? srOrder?.data?.order_id ?? null;
      const shipmentId = srOrder?.shipment_id ?? srOrder?.data?.shipment_id ?? null;
      let awb = null;
      let courierName = quote?.courier_name ?? null;
      let pickupStatus = null;

      if (shipmentId && quote?.courier_id) {
        const awbRes = await assignAwb({
          shipment_id: shipmentId,
          courier_id: quote.courier_id,
        });
        awb = awbRes?.awb_code ?? awbRes?.response?.data?.awb_code ?? awbRes?.data?.awb_code ?? null;
        courierName = awbRes?.courier_name ?? courierName;

        try {
          const pickupRes = await generatePickup({ shipment_id: shipmentId });
          pickupStatus = pickupRes?.message || pickupRes?.pickup_status || "requested";
        } catch (err) {
          pickupStatus = err.message || "pickup_request_failed";
        }
      }

      const trackingQ = await pool.query(
        `INSERT INTO delivery_tracking
          (order_id, tracking_number, courier_name, status, shiprocket_order_id, shiprocket_shipment_id, shiprocket_courier_id, pickup_status, created_at, updated_at)
         VALUES ($1,$2,$3,'shipment_created',$4,$5,$6,$7,NOW(),NOW())
         RETURNING *`,
        [
          orderId,
          awb,
          courierName,
          shiprocketOrderId,
          shipmentId,
          quote?.courier_id ? String(quote.courier_id) : null,
          pickupStatus,
        ]
      );

      results.push({
        seller_id: sellerId,
        shiprocket_order_id: shiprocketOrderId,
        shiprocket_shipment_id: shipmentId,
        awb_code: awb,
        tracking: trackingQ.rows[0],
      });
    }

    return results;
  } catch (err) {
    console.error("Shiprocket Shipment Error:", err);
    return [{ error: err.message || "Shiprocket shipment failed" }];
  }
};

/* ============================================================
   CREATE ORDER (Customer)
============================================================ */
export const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const user_id = req.user.id;
    const { address_id, coupon_id, payment_method, shipping_quote } = req.body;

    // Debug: log incoming payload for development troubleshooting
    console.log("CreateOrder payload:", { user_id, address_id, payment_method, coupon_id });

    // Validate address exists early to avoid database errors later
    if (address_id) {
      try {
        const addrCheck = await pool.query(`SELECT id FROM addresses WHERE id = $1`, [address_id]);
        if (addrCheck.rowCount === 0) {
          return res.status(400).json({ message: "Address not found" });
        }
      } catch (addrErr) {
        console.warn("Address validation failed:", addrErr?.message || addrErr);
        // continue — we will catch errors later, but surface a warning
      }
    }

    // Validate required fields
    if (!address_id || !payment_method) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Enforce supported payment methods to prevent deprecated/removed options (e.g., netbanking)
    const allowedPaymentMethods = new Set(["card", "upi", "cod"]);
    if (!allowedPaymentMethods.has(String(payment_method))) {
      return res.status(400).json({ message: "Unsupported payment method" });
    }

    await client.query("BEGIN");
    try {
      // Ensure product shipping columns exist (best-effort). If this fails due to
      // permissions or environment, don't abort the order flow — log and continue.
      await ensureProductShippingColumns(client);
    } catch (migrationErr) {
      console.warn("Warning: ensureProductShippingColumns failed:", migrationErr?.message || migrationErr);
    }

    // 🔒 Lock cart items & products (prevents overselling)
    const cartQ = await client.query(
      `
      SELECT 
        ci.id AS cart_item_id,
        ci.quantity,
        ci.size,
        ci.color,
        p.id AS product_id,
        p.title,
        ROUND((COALESCE(ps.price, p.price) * (1 - COALESCE(NULLIF(ps.discount_percent, 0), p.discount_percent, 0) / 100.0))::numeric, 2) AS price,
        p.stock,
        p.seller_id,
        p.weight_kg,
        p.length_cm,
        p.width_cm,
        p.height_cm
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_sizes ps ON ps.product_id = p.id AND ps.size = ci.size
      WHERE c.user_id = $1
      FOR UPDATE OF ci, p
      `,
      [user_id]
    );

    if (cartQ.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock
    for (const item of cartQ.rows) {
      if (item.stock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Insufficient stock for product ${item.product_id}`,
        });
      }
    }

  // Create order
    const orderQ = await client.query(
      `
      INSERT INTO orders (user_id, status, payment_status, payment_method, address_id, created_at)
      VALUES ($1, 'order_created', 'pending', $2, $3, NOW())
      RETURNING *
      `,
      [user_id, payment_method, address_id]
    );

    const order = orderQ.rows[0];

    // Determine whether order_items table has size/color columns (for compatibility)
    const itemColsQ = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name IN ('size','color')`
    );
    const itemCols = new Set(itemColsQ.rows.map((r) => r.column_name));

    // Insert order items, update stock and compute totals
    const items = [];
    const sellerTotals = new Map();
    let orderTotal = 0;

    for (const item of cartQ.rows) {
      // Insert into order_items using only columns that exist in this DB
      if (itemCols.has('size') && itemCols.has('color')) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, size, color) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [order.id, item.product_id, item.seller_id, item.quantity, item.price, item.size ?? null, item.color ?? null]
        );
      } else if (itemCols.has('size')) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, size) VALUES ($1,$2,$3,$4,$5,$6)`,
          [order.id, item.product_id, item.seller_id, item.quantity, item.price, item.size ?? null]
        );
      } else if (itemCols.has('color')) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, color) VALUES ($1,$2,$3,$4,$5,$6)`,
          [order.id, item.product_id, item.seller_id, item.quantity, item.price, item.color ?? null]
        );
      } else {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price) VALUES ($1,$2,$3,$4,$5)`,
          [order.id, item.product_id, item.seller_id, item.quantity, item.price]
        );
      }

      await client.query(
        `
        UPDATE products
        SET stock = stock - $1,
            status = CASE
              WHEN stock - $1 <= 0 THEN 'out_of_stock'
              ELSE status
            END
        WHERE id = $2
        `,
        [item.quantity, item.product_id]
      );

      const subtotal = Number((item.price * item.quantity).toFixed(2));
      orderTotal += subtotal;

      // accumulate per-seller totals
      const prev = sellerTotals.get(item.seller_id) || 0;
      sellerTotals.set(item.seller_id, Number((prev + subtotal).toFixed(2)));

      items.push({
        product_id: item.product_id,
        seller_id: item.seller_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size ?? null,
        color: item.color ?? null,
        subtotal,
      });
    }

    // Clear cart
    await client.query(
      `
      DELETE FROM cart_items
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)
      `,
      [user_id]
    );

    await client.query("COMMIT");

    const shipmentResults = await createShiprocketShipmentsForOrder({
      orderId: order.id,
      userId: user_id,
      addressId: address_id,
      paymentMethod: payment_method,
      cartItems: cartQ.rows,
      shippingQuote: shipping_quote,
    });

    // Build per-seller breakdown for response
    const per_seller = Array.from(sellerTotals.entries()).map(([seller_id, total]) => ({ seller_id, total }));

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        id: order.id,
        user_id,
        payment_method,
        address_id,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        total: Number(orderTotal.toFixed(2)),
        per_seller,
        shipments: shipmentResults,
        items,
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create Order Error:", err);
    // During development include error message to aid debugging
    res.status(500).json({ message: "Failed to place order", error: err?.message || String(err) });
  } finally {
    client.release();
  }
};

/* ============================================================
   GET CUSTOMER ORDERS
============================================================ */
export const getMyOrders = async (req, res) => {
  try {
    const user_id = req.user.id;
    // Check if order_items has size/color columns (some deployments may not)
    const colQ = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name IN ('size','color')`
    );
    const cols = new Set(colQ.rows.map((r) => r.column_name));

    const itemFields = [
      "'product_id', oi.product_id",
      "'quantity', oi.quantity",
      "'price', oi.price",
    ];
    if (cols.has('size')) itemFields.push("'size', oi.size");
    if (cols.has('color')) itemFields.push("'color', oi.color");

    const q = await pool.query(
      `
      SELECT 
        o.id,
        o.status,
        o.payment_status,
        o.created_at,
        json_agg(
          json_build_object(
            'product', json_build_object(
              'id', p.id,
              'title', COALESCE(p.title, ''),
              'image', COALESCE(p.image_url, '')
            ),
            ${itemFields.join(',\n            ')}
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.status, o.payment_status, o.created_at
      ORDER BY o.created_at DESC
      `,
      [user_id]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get My Orders Error:", err);
    // During development return the error message to help debugging (remove in production)
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

/* ============================================================
   GET SELLER ORDERS (ISOLATED, SAFE)
============================================================ */
export const getSellerOrders = async (req, res) => {
  try {
    const seller_id = req.user.id;
    // Check if order_items has size/color columns
    const colQ = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name IN ('size','color')`
    );
    const cols = new Set(colQ.rows.map((r) => r.column_name));

    const itemFields = [
      "'product_id', p.id",
      "'title', p.title",
      "'quantity', oi.quantity",
      "'price', oi.price",
    ];
    if (cols.has('size')) itemFields.push("'size', oi.size");
    if (cols.has('color')) itemFields.push("'color', oi.color");

    const q = await pool.query(
        `
        SELECT
          o.id AS order_id,
          o.created_at,
          o.status,
          o.payment_status,
          o.payment_method,
          o.address_id,
          COALESCE(SUM(oi.price * oi.quantity), 0) AS seller_total,
          json_build_object(
            'id', u.id,
            'name', COALESCE(u.name, ''),
            'email', COALESCE(u.email, '')
          ) AS customer,
          CASE
            WHEN a.id IS NULL THEN NULL
            ELSE json_build_object(
              'id', a.id,
              'full_name', a.full_name,
              'phone', a.phone,
              'line1', a.line1,
              'line2', a.line2,
              'city', a.city,
              'state', a.state,
              'postal_code', a.postal_code,
              'country', a.country
            )
          END AS shipping_address,
          json_agg(
            json_build_object(
              ${itemFields.join(',\n              ')}
            ) ORDER BY oi.id
          ) AS items
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN addresses a ON a.id = o.address_id
        WHERE oi.seller_id = $1 OR p.seller_id = $1
        GROUP BY
          o.id,
          o.created_at,
          o.status,
          o.payment_status,
          o.payment_method,
          o.address_id,
          u.id,
          u.name,
          u.email,
          a.id,
          a.full_name,
          a.phone,
          a.line1,
          a.line2,
          a.city,
          a.state,
          a.postal_code,
          a.country
        ORDER BY o.created_at DESC
        `,
      [seller_id]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Seller Orders Error:", err);
    res.status(500).json({ message: "Failed to fetch seller orders", error: err?.message || String(err) });
  }
};

/* ============================================================
   GET ORDER BY ID (ROLE SAFE)
   - Customer: only their order
   - Seller: only if they have items in the order
   - Admin: can view any order
============================================================ */
export const getOrderById = async (req, res) => {
  try {
    const user = req.user;
    const order_id = req.params.id;

    // fetch basic order and items
      // Check if order_items has size/color columns (backwards compatible)
      const colQ = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' AND column_name IN ('size','color')`
      );
      const cols = new Set(colQ.rows.map((r) => r.column_name));

      const itemFields = [
        "'product_id', oi.product_id",
        "'seller_id', oi.seller_id",
        "'quantity', oi.quantity",
        "'price', oi.price",
      ];
      if (cols.has('size')) itemFields.push("'size', oi.size");
      if (cols.has('color')) itemFields.push("'color', oi.color");

      const q = await pool.query(
        `
        SELECT o.*, json_agg(json_build_object(
          ${itemFields.join(',\n        ')}
        )) AS items
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.id = $1
        GROUP BY o.id
        `,
        [order_id]
      );

    if (q.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

    const order = q.rows[0];

    // determine roles for the requesting user
    const rolesRes = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND (is_blocked IS NOT TRUE)`,
      [user.id]
    );
    const roles = rolesRes.rows.map(r => r.role);

    const isAdmin = roles.includes('admin');
    const isSeller = roles.includes('seller');
    const isCustomer = roles.includes('customer');

    if (isAdmin) return res.json(order);

    if (isCustomer && order.user_id === user.id) return res.json(order);

    if (isSeller) {
      const ownQ = await pool.query(
        `SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1`,
        [order_id, user.id]
      );
      if (ownQ.rowCount > 0) return res.json(order);
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    console.error('Get Order By Id Error:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

/* ============================================================
   CANCEL ORDER (Customer)
   - Customer can cancel before fulfillment (not after shipped/delivered)
   - Restores product stock if cancellation succeeds
============================================================ */
export const cancelOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const order_id = req.params.id;

    // ensure order belongs to customer
    const orderQ = await client.query(`SELECT * FROM orders WHERE id = $1`, [order_id]);
    if (orderQ.rowCount === 0) return res.status(404).json({ message: 'Order not found' });

    const order = orderQ.rows[0];
    if (order.user_id !== user.id) return res.status(403).json({ message: 'Unauthorized' });

    // cannot cancel if already shipped/in_transit/out_for_delivery/delivered
    const disallowed = new Set(['shipped','in_transit','out_for_delivery','delivered','cancelled','returned','refunded']);
    if (disallowed.has(order.status)) return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });

    await client.query('BEGIN');

    // set status to cancelled
    const newPaymentStatus = order.payment_status === 'paid' ? 'refunded' : order.payment_status;
    await client.query(`UPDATE orders SET status = 'cancelled', payment_status = $1 WHERE id = $2`, [newPaymentStatus, order_id]);

    // restore stocks for items
    const itemsQ = await client.query(`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, [order_id]);
    for (const it of itemsQ.rows) {
      await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [it.quantity, it.product_id]);
    }

    await client.query('COMMIT');

    res.json({ message: 'Order cancelled', order_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel Order Error:', err);
    res.status(500).json({ message: 'Failed to cancel order' });
  } finally {
    client.release();
  }
};

/* ============================================================
   UPDATE ORDER STATUS (ROLE-SAFE)
============================================================ */
export const updateOrderStatus = async (req, res) => {
  try {
    const user = req.user;
    const order_id = req.params.id;
    const { status, payment_status } = req.body;
    // Load roles for the requesting user (verifyToken only sets id/email)
    const rolesRes = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND (is_blocked IS NOT TRUE)`,
      [user.id]
    );
    const roles = rolesRes.rows.map(r => r.role);
    const isAdmin = roles.includes('admin');
    const isSeller = roles.includes('seller');

    // 🔒 Seller restrictions (determine role from DB)
    if (isSeller) {
      if (payment_status) {
        return res.status(403).json({ message: "Seller cannot update payment status" });
      }

      // Sellers can update fulfillment statuses only
      const allowedSellerStatuses = ["processing", "packed", "shipped", "out_for_delivery"];
      if (status && !allowedSellerStatuses.includes(status)) {
        return res.status(403).json({ message: "Seller cannot set this order status" });
      }

      // Ensure seller owns at least one item in the order
      const ownsQ = await pool.query(
        `SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1`,
        [order_id, user.id]
      );

      if (ownsQ.rowCount === 0) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    // 🔒 Admin only payment updates
    if (payment_status && !isAdmin) {
      return res.status(403).json({ message: "Only admin can update payment status" });
    }

    const fields = [];
    const values = [];
    let i = 1;

    if (status) {
      // Normalize invalid legacy values to enum-safe values
      const normalized =
        status === "placed" || status === "pending" ? "order_created" : status;

      // Enforce enum-safe writes
      const allowedStatuses = new Set([
        "order_created",
        "payment_confirmed",
        "processing",
        "packed",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ]);

      if (!allowedStatuses.has(normalized)) {
        return res.status(400).json({ message: "Invalid order status" });
      }

      fields.push(`status = $${i++}`);
      values.push(normalized);
    }

    if (payment_status) {
      fields.push(`payment_status = $${i++}`);
      values.push(payment_status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    values.push(order_id);

    const q = await pool.query(
      `
      UPDATE orders
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING *
      `,
      values
    );

    res.json({
      message: "Order updated",
      order: q.rows[0],
    });
  } catch (err) {
    console.error("Update Order Status Error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
};
