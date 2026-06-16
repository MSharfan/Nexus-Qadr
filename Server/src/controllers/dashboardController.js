import pool from "../config/db.js";

/* ============================================================
   ADMIN DASHBOARD OVERVIEW
============================================================ */
export const getAdminOverview = async (req, res) => {
  try {
    // Count users by role from user_roles table
    const rolesQ = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'customer') AS customers,
        COUNT(*) FILTER (WHERE role = 'seller')   AS sellers
      FROM user_roles
    `);

    // Paid revenue only (sum order_items price * quantity because orders.total_amount may not exist)
    const revenueQ = await pool.query(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
    `);

    // Paid orders count
    const ordersQ = await pool.query(`
      SELECT COUNT(*) AS orders
      FROM orders
      WHERE payment_status = 'paid'
    `);

    res.json({
      customers: Number(rolesQ.rows[0].customers),
      sellers: Number(rolesQ.rows[0].sellers),
      total_revenue: Number(revenueQ.rows[0].revenue),
      total_orders: Number(ordersQ.rows[0].orders),
    });
  } catch (err) {
    console.error("Admin Overview Error:", err);
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
};


/* ============================================================
   SELLER / ADMIN: SELLER EARNINGS
============================================================ */
export const getSellerEarnings = async (req, res) => {
  try {
    const requester = req.user;
    const sellerId = req.params.id || requester.id;

    // Sellers can see only themselves
    if (requester.activeRole === "seller" && requester.id !== sellerId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Total earnings (paid orders only)
    const totalQ = await pool.query(
      `
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
      `,
      [sellerId]
    );

    // Monthly earnings (paid only)
    const monthlyQ = await pool.query(
      `
      SELECT
        DATE_TRUNC('month', o.created_at) AS month,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS earnings
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
      GROUP BY month
      ORDER BY month
      `,
      [sellerId]
    );

    res.json({
      total_earnings: Number(totalQ.rows[0].total),
      monthly_earnings: monthlyQ.rows.map((r) => ({
        month: r.month,
        earnings: Number(r.earnings),
      })),
    });
  } catch (err) {
    console.error("Seller Earnings Error:", err);
    res.status(500).json({ message: "Failed to fetch seller earnings" });
  }
};

/* ============================================================
   ADMIN: TOP PRODUCTS (PAID ORDERS ONLY)
============================================================ */
export const getTopProducts = async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT
        p.id,
        p.title,
        SUM(oi.quantity) AS units_sold,
        SUM(oi.price * oi.quantity) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.payment_status = 'paid'
      GROUP BY p.id, p.title
      ORDER BY revenue DESC
      LIMIT 10
    `);

    res.json(
      q.rows.map((r) => ({
        ...r,
        units_sold: Number(r.units_sold),
        revenue: Number(r.revenue),
      }))
    );
  } catch (err) {
    console.error("Top Products Error:", err);
    res.status(500).json({ message: "Failed to load top products" });
  }
};

/* ============================================================
   ADMIN: CATEGORY SALES (PAID ORDERS ONLY)
============================================================ */
export const getCategorySales = async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT
        c.name AS category,
        SUM(oi.price * oi.quantity) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE o.payment_status = 'paid'
      GROUP BY c.name
      ORDER BY revenue DESC
    `);

    res.json(
      q.rows.map((r) => ({
        category: r.category,
        revenue: Number(r.revenue),
      }))
    );
  } catch (err) {
    console.error("Category Sales Error:", err);
    res.status(500).json({ message: "Failed to load category sales" });
  }
};
