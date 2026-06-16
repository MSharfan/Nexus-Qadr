import pool from "../config/db.js";

/**
 * Core: process a courier update for a given tracking_number.
 * This centralizes DB updates so webhooks and demo simulators reuse same logic.
 */
const processCourierUpdate = async (client, tracking_number, status, location = null, note = null) => {
  // Lock tracking row to avoid concurrent courier updates
  const tQ = await client.query(
    "SELECT * FROM delivery_tracking WHERE tracking_number = $1 FOR UPDATE",
    [tracking_number]
  );
  if (tQ.rowCount === 0) {
    const e = new Error("Tracking not found");
    e.code = "TRACKING_NOT_FOUND";
    throw e;
  }

  await client.query(
    `INSERT INTO delivery_status_history
       (tracking_id, status, location, note, source, created_at)
       VALUES ($1,$2,$3,$4,'courier',NOW())`,
    [tQ.rows[0].id, status, location, note]
  );

  await client.query(
    `UPDATE delivery_tracking
       SET status = $1,
           current_location = COALESCE($2, current_location),
           updated_at = NOW()
       WHERE id = $3`,
    [status, location, tQ.rows[0].id]
  );

  // Sync order status based on delivery status in the same transaction
  const mappedStatus = mapDeliveryToOrderStatus(status);
  if (mappedStatus) {
    // Lock order row to prevent race with other status updates
    await client.query("SELECT 1 FROM orders WHERE id = $1 FOR UPDATE", [tQ.rows[0].order_id]);
    await client.query(
      `UPDATE orders
         SET status = $1, status_updated_at = NOW()
         WHERE id = $2`,
      [mappedStatus, tQ.rows[0].order_id]
    );
  }

  return tQ.rows[0];
};

/**
 * Helper: check seller owns order
 */
const sellerOwnsOrder = async (orderId, sellerId) => {
  const q = await pool.query(
    `SELECT 1
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1 AND (oi.seller_id = $2 OR p.seller_id = $2)
     LIMIT 1`,
    [orderId, sellerId]
  );
  return q.rowCount > 0;
};

/**
 * Map delivery tracking status to order status enum.
 * Only values in order_status_enum are returned, otherwise null.
 */
const mapDeliveryToOrderStatus = (status) => {
  const s = String(status ?? "").toLowerCase();
  switch (s) {
    case "shipped":
      return "shipped";
    case "in_transit":
      return "in_transit";
    case "out_for_delivery":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "returned":
      return "returned";
    case "refunded":
      return "refunded";
    default:
      return null;
  }
};

/* ============================================================
   CREATE TRACKING (SELLER)
============================================================ */
export const createTracking = async (req, res) => {
  const client = await pool.connect();
  try {
    const sellerId = req.user.id;
    const {
      order_id,
      tracking_number = null,
      courier_name = null,
      estimated_delivery = null,
      initial_status = "in_transit"
    } = req.body;

    await client.query("BEGIN");

    // Lock order row to prevent race conditions with status updates
    const orderQ = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [order_id]
    );
    if (orderQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const owns = await sellerOwnsOrder(order_id, sellerId);
    if (!owns) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Not your order" });
    }

    const ins = await client.query(
      `INSERT INTO delivery_tracking
       (order_id, tracking_number, courier_name, status, estimated_delivery, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING *`,
      [order_id, tracking_number, courier_name, initial_status, estimated_delivery]
    );

    await client.query(
      `INSERT INTO delivery_status_history
       (tracking_id, status, note, source, created_at)
       VALUES ($1,$2,$3,'system',NOW())`,
      [ins.rows[0].id, initial_status, "Shipment created"]
    );

    // Sync order status from delivery status in the same transaction
    const mappedStatus = mapDeliveryToOrderStatus(initial_status);
    if (mappedStatus) {
      await client.query(
        `UPDATE orders
         SET status = $1, status_updated_at = NOW()
         WHERE id = $2`,
        [mappedStatus, order_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Tracking created", tracking: ins.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create Tracking Error:", err);
    res.status(500).json({ message: "Failed to create tracking" });
  } finally {
    client.release();
  }
};

/* ============================================================
   UPDATE TRACKING STATUS (SELLER)
============================================================ */
export const updateTrackingStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const sellerId = req.user.id;
    const { tracking_id } = req.params;
    const { status, current_location = null, note = null } = req.body;

    await client.query("BEGIN");

    // Lock tracking row to prevent concurrent updates
    const tQ = await client.query(
      "SELECT * FROM delivery_tracking WHERE id = $1 FOR UPDATE",
      [tracking_id]
    );
    if (tQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Tracking not found" });
    }

    const owns = await sellerOwnsOrder(tQ.rows[0].order_id, sellerId);
    if (!owns) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Forbidden" });
    }

    const upd = await client.query(
      `UPDATE delivery_tracking
       SET status = COALESCE($1, status),
           current_location = COALESCE($2, current_location),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, current_location, tracking_id]
    );

    await client.query(
      `INSERT INTO delivery_status_history
       (tracking_id, status, location, note, source, created_at)
       VALUES ($1,$2,$3,$4,'system',NOW())`,
      [tracking_id, status || upd.rows[0].status, current_location, note]
    );

    // Sync order status based on delivery status in the same transaction
    const mappedStatus = mapDeliveryToOrderStatus(upd.rows[0].status);
    if (mappedStatus) {
      await client.query(
        `UPDATE orders
         SET status = $1, status_updated_at = NOW()
         WHERE id = $2`,
        [mappedStatus, upd.rows[0].order_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Tracking updated", tracking: upd.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update Tracking Error:", err);
    res.status(500).json({ message: "Failed to update tracking" });
  } finally {
    client.release();
  }
};

/* ============================================================
   ADD TRACKING HISTORY
============================================================ */
export const addTrackingHistory = async (req, res) => {
  try {
    const { tracking_id } = req.params;
    const { status, location = null, note = null } = req.body;

    const tQ = await pool.query(
      "SELECT * FROM delivery_tracking WHERE id = $1",
      [tracking_id]
    );
    if (tQ.rowCount === 0) {
      return res.status(404).json({ message: "Tracking not found" });
    }

    const h = await pool.query(
      `INSERT INTO delivery_status_history
       (tracking_id, status, location, note, source, created_at)
       VALUES ($1,$2,$3,$4,'system',NOW())
       RETURNING *`,
      [tracking_id, status, location, note]
    );

    res.json({ message: "History added", history: h.rows[0] });
  } catch (err) {
    console.error("Add Tracking History Error:", err);
    res.status(500).json({ message: "Failed to add history" });
  }
};

/* ============================================================
   WEBHOOK UPDATE (COURIER)
============================================================ */
export const webhookUpdate = async (req, res) => {
  const client = await pool.connect();
  try {
    const { tracking_number, status, location, note, secret } = req.body;

    if (
      process.env.TRACKING_WEBHOOK_SECRET &&
      secret !== process.env.TRACKING_WEBHOOK_SECRET
    ) {
      return res.status(403).json({ message: "Invalid webhook secret" });
    }

    await client.query("BEGIN");

    // Lock tracking row to avoid concurrent courier updates
    const tQ = await client.query(
      "SELECT * FROM delivery_tracking WHERE tracking_number = $1 FOR UPDATE",
      [tracking_number]
    );
    if (tQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Tracking not found" });
    }

    await client.query(
      `INSERT INTO delivery_status_history
       (tracking_id, status, location, note, source, created_at)
       VALUES ($1,$2,$3,$4,'courier',NOW())`,
      [tQ.rows[0].id, status, location, note]
    );

    await client.query(
      `UPDATE delivery_tracking
       SET status = $1,
           current_location = COALESCE($2, current_location),
           updated_at = NOW()
       WHERE id = $3`,
      [status, location, tQ.rows[0].id]
    );

    // Sync order status based on delivery status in the same transaction
    const mappedStatus = mapDeliveryToOrderStatus(status);
    if (mappedStatus) {
      // Lock order row to prevent race with other status updates
      await client.query(
        "SELECT 1 FROM orders WHERE id = $1 FOR UPDATE",
        [tQ.rows[0].order_id]
      );
      await client.query(
        `UPDATE orders
         SET status = $1, status_updated_at = NOW()
         WHERE id = $2`,
        [mappedStatus, tQ.rows[0].order_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Webhook processed" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Webhook failed" });
  } finally {
    client.release();
  }
};

/* ============================================================
   DEMO: Blue Dart webhook simulator
   - Lightweight endpoint to simulate Blue Dart updates during development/testing.
   - This does not require a secret but will only run when NODE_ENV !== 'production' or when
     DEMO_WEBHOOKS_ENABLED=true is set in env.
============================================================ */
export const demoBlueDartWebhook = async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.DEMO_WEBHOOKS_ENABLED) {
    return res.status(403).json({ message: 'Demo webhooks disabled in production' });
  }

  const client = await pool.connect();
  try {
    const { tracking_number, status, location, note } = req.body;
    if (!tracking_number || !status) return res.status(400).json({ message: 'tracking_number and status required' });

    await client.query('BEGIN');
    try {
      const t = await processCourierUpdate(client, tracking_number, status, location, note);
      await client.query('COMMIT');
      return res.json({ message: 'Demo update applied', tracking: t });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === 'TRACKING_NOT_FOUND') return res.status(404).json({ message: 'Tracking not found' });
      throw err;
    }
  } catch (err) {
    console.error('Demo Webhook Error:', err);
    res.status(500).json({ message: 'Demo webhook failed' });
  } finally {
    client.release();
  }
};

/* ============================================================
   GET TRACKING BY ORDER (CUSTOMER OR SELLER)
============================================================ */
export const getTrackingByOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.id;

    const orderQ = await pool.query(
      "SELECT user_id FROM orders WHERE id = $1",
      [order_id]
    );

    if (orderQ.rowCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isCustomerOrder = orderQ.rows[0].user_id === userId;
    const isSellerOrder = await sellerOwnsOrder(order_id, userId);
    const rolesQ = await pool.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND (is_blocked IS NOT TRUE)",
      [userId]
    );
    const isAdmin = rolesQ.rows.some((row) => row.role === "admin");

    if (!isAdmin && !isCustomerOrder && !isSellerOrder) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const tQ = await pool.query(
      "SELECT * FROM delivery_tracking WHERE order_id = $1",
      [order_id]
    );

    if (tQ.rowCount === 0) {
      return res.status(404).json({ message: "No tracking found" });
    }

    const historyQ = await pool.query(
      "SELECT * FROM delivery_status_history WHERE tracking_id = $1 ORDER BY created_at",
      [tQ.rows[0].id]
    );

    res.json({
      tracking: tQ.rows[0],
      history: historyQ.rows
    });
  } catch (err) {
    console.error("Get Tracking Error:", err);
    res.status(500).json({ message: "Failed to fetch tracking" });
  }
};


/* ============================================================
   LIST SELLER TRACKINGS
============================================================ */
export const listSellerTrackings = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const q = await pool.query(
      `SELECT DISTINCT dt.*
       FROM delivery_tracking dt
       JOIN order_items oi ON oi.order_id = dt.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.seller_id = $1
       ORDER BY dt.created_at DESC`,
      [sellerId]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("List Seller Trackings Error:", err);
    res.status(500).json({ message: "Failed to list trackings" });
  }
};

/* ============================================================
   GET TRACKING DETAILS (AUTHENTICATED USER)
============================================================ */
export const getTrackingDetails = async (req, res) => {
  try {
    const { tracking_id } = req.params;
    const userId = req.user.id;

    const tQ = await pool.query(
      `
      SELECT dt.*, o.user_id
      FROM delivery_tracking dt
      JOIN orders o ON o.id = dt.order_id
      WHERE dt.id = $1
      `,
      [tracking_id]
    );

    if (tQ.rowCount === 0) {
      return res.status(404).json({ message: "Tracking not found" });
    }

    const tracking = tQ.rows[0];

    // Check seller ownership
    const sellerCheck = await pool.query(
      `
      SELECT 1
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 AND p.seller_id = $2
      LIMIT 1
      `,
      [tracking.order_id, userId]
    );

    const isCustomer = tracking.user_id === userId;
    const isSeller = sellerCheck.rowCount > 0;
    const rolesQ = await pool.query(
        "SELECT role FROM user_roles WHERE user_id = $1 AND (is_blocked IS NOT TRUE)",
        [userId]
      );
      const isAdmin = rolesQ.rows.some((row) => row.role === "admin");

    if (!isAdmin && !isCustomer && !isSeller) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const historyQ = await pool.query(
      "SELECT * FROM delivery_status_history WHERE tracking_id = $1 ORDER BY created_at",
      [tracking_id]
    );

    res.json({
      tracking,
      history: historyQ.rows
    });
  } catch (err) {
    console.error("Get Tracking Details Error:", err);
    res.status(500).json({ message: "Failed to fetch tracking details" });
  }
};
