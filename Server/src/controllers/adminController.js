import pool from "../config/db.js";

// ---------------------- ALL USERS ----------------------
export const getAllUsers = async (req, res) => {
  try {
    // role is stored in user_roles table (normalized). Use a subquery to fetch one role per user.
    // Return role objects with is_blocked so UI can show role-level blocked state
    const users = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              COALESCE(json_agg(DISTINCT jsonb_build_object('role', ur.role, 'is_blocked', COALESCE(ur.is_blocked, false))) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles,
              u.is_blocked,
              u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(users.rows);
  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- SELLERS ----------------------
export const getAllSellers = async (req, res) => {
  try {
    // Filter users who have a 'seller' role in user_roles
    const sellers = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              COALESCE(json_agg(DISTINCT jsonb_build_object('role', ur.role, 'is_blocked', COALESCE(ur.is_blocked, false))) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles,
              u.is_blocked,
              u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role = 'seller')
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(sellers.rows);
  } catch (err) {
    console.error("Get All Sellers Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- CUSTOMERS ----------------------
export const getAllCustomers = async (req, res) => {
  try {
    // Filter users who have a 'customer' role in user_roles
    const customers = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              COALESCE(json_agg(DISTINCT jsonb_build_object('role', ur.role, 'is_blocked', COALESCE(ur.is_blocked, false))) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles,
              u.is_blocked,
              u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role = 'customer')
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(customers.rows);
  } catch (err) {
    console.error("Get All Customers Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- BLOCK USER ----------------------
export const blockUser = async (req, res) => {
  try {
    const id = req.params.id;

    const r = await pool.query(
      `UPDATE users SET is_blocked = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (r.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User blocked", user: r.rows[0] });

  } catch (err) {
    console.error("Block User Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- UNBLOCK USER ----------------------
export const unblockUser = async (req, res) => {
  try {
    const id = req.params.id;

    const r = await pool.query(
      `UPDATE users SET is_blocked = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (r.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User unblocked", user: r.rows[0] });

  } catch (err) {
    console.error("Unblock User Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- BLOCK ROLE FOR USER ----------------------
export const blockUserRole = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.query.role || req.body.role;

    if (!role) return res.status(400).json({ message: 'Role query param required' });

    // Update the user_roles entry for this user+role to set is_blocked = true
    const r = await pool.query(
      `UPDATE user_roles SET is_blocked = TRUE WHERE user_id = $1 AND role = $2 RETURNING *`,
      [id, role]
    );

    if (r.rows.length === 0)
      return res.status(404).json({ message: "Role entry not found for user" });

    res.json({ message: `Role '${role}' blocked for user`, entry: r.rows[0] });
  } catch (err) {
    console.error("Block User Role Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- UNBLOCK ROLE FOR USER ----------------------
export const unblockUserRole = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.query.role || req.body.role;

    if (!role) return res.status(400).json({ message: 'Role query param required' });

    const r = await pool.query(
      `UPDATE user_roles SET is_blocked = FALSE WHERE user_id = $1 AND role = $2 RETURNING *`,
      [id, role]
    );

    if (r.rows.length === 0)
      return res.status(404).json({ message: "Role entry not found for user" });

    res.json({ message: `Role '${role}' unblocked for user`, entry: r.rows[0] });
  } catch (err) {
    console.error("Unblock User Role Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- APPROVE SELLER ----------------------
export const approveSeller = async (req, res) => {
  try {
    const id = req.params.id;

    // Only mark as verified if the user has a 'seller' role in user_roles
    const r = await pool.query(
      `UPDATE users u
       SET is_verified_seller = TRUE
       WHERE u.id = $1 AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'seller')
       RETURNING *`,
      [id]
    );

    if (r.rows.length === 0)
      return res.status(404).json({ message: "Seller not found" });

    res.json({ message: "Seller approved", seller: r.rows[0] });

  } catch (err) {
    console.error("Approve Seller Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- ALL PRODUCTS ----------------------
export const getAllProducts = async (req, res) => {
  try {
    // Ensure product_flags table exists (lightweight migration)
    await pool.query(
      `CREATE TABLE IF NOT EXISTS product_flags (
         product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
         is_trending boolean DEFAULT FALSE
       )`
    );

    const { trending } = req.query;

    const values = [];
    let where = "";
    if (trending === "true") {
      where = "WHERE pf.is_trending = TRUE";
    }

    const q = await pool.query(
      `SELECT p.*, COALESCE(pf.is_trending, FALSE) AS is_trending
       FROM products p
       LEFT JOIN product_flags pf ON pf.product_id = p.id
       ${where}
       ORDER BY p.created_at DESC`,
      values
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get All Products Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- SET / UNSET PRODUCT TRENDING (ADMIN) ----------------------
export const setProductTrending = async (req, res) => {
  try {
    const productId = req.params.id;
    const { is_trending } = req.body;

    if (typeof is_trending !== "boolean") {
      return res.status(400).json({ message: "is_trending boolean required" });
    }

    // Ensure product_flags table exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS product_flags (
         product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
         is_trending boolean DEFAULT FALSE
       )`
    );

    // Upsert flag
    await pool.query(
      `INSERT INTO product_flags (product_id, is_trending)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET is_trending = EXCLUDED.is_trending`,
      [productId, is_trending]
    );

    const pq = await pool.query("SELECT * FROM products WHERE id = $1", [productId]);
    if (pq.rows.length === 0) return res.status(404).json({ message: "Product not found" });

    const product = pq.rows[0];
    res.json({ message: "Trending flag updated", product: { ...product, is_trending } });
  } catch (err) {
    console.error("Set Product Trending Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- ALL ORDERS ----------------------
export const getAllOrders = async (req, res) => {
  try {
    const o = await pool.query(
      `SELECT
         o.*,
         COALESCE(SUM(oi.price * oi.quantity), 0) AS total_amount,
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
         json_agg(json_build_object(
           'product_id', oi.product_id,
           'title', p.title,
           'price', oi.price,
           'quantity', oi.quantity
         ) ORDER BY oi.id) AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN addresses a ON a.id = o.address_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       GROUP BY
         o.id,
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
       ORDER BY o.created_at DESC`
    );

    res.json(o.rows);
  } catch (err) {
    console.error("Get All Orders Error:", err);
    res.status(500).json({ error: err.message });
  }
};
