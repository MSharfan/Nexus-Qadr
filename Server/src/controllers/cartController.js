// Server/src/controllers/cartController.js
import pool from "../config/db.js";

/* ============================================================
   HELPER: Get or Create Cart
============================================================ */
const getOrCreateCart = async (customer_id) => {
  const existing = await pool.query(
    "SELECT * FROM carts WHERE user_id = $1",
    [customer_id]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    "INSERT INTO carts (user_id, created_at) VALUES ($1, NOW()) RETURNING *",
    [customer_id]
  );

  return created.rows[0];
};

/* ============================================================
   ADD PRODUCT TO CART
============================================================ */
export const addToCart = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { product_id, quantity, size, color } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        message: "Product and valid quantity are required",
      });
    }

    // Validate product
    const productQ = await pool.query(
      "SELECT id, stock, status FROM products WHERE id = $1",
      [product_id]
    );

    if (productQ.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productQ.rows[0];

    if (product.status !== "active") {
      return res.status(400).json({
        message: "Product is not available",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
      });
    }

    const cart = await getOrCreateCart(customer_id);

    // Check if product already in cart
    const existing = await pool.query(
      `SELECT * FROM cart_items 
       WHERE cart_id = $1 AND product_id = $2
         AND COALESCE(size, '') = COALESCE($3, '')
         AND COALESCE(color, '') = COALESCE($4, '')`,
      [cart.id, product_id, size ?? null, color ?? null]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + quantity;

      if (newQty > product.stock) {
        return res.status(400).json({
          message: "Quantity exceeds available stock",
        });
      }

      const updated = await pool.query(
        `UPDATE cart_items
         SET quantity = $1
         WHERE cart_id = $2 AND product_id = $3
           AND COALESCE(size, '') = COALESCE($4, '')
           AND COALESCE(color, '') = COALESCE($5, '')
         RETURNING *`,
        [newQty, cart.id, product_id, size ?? null, color ?? null]
      );

      return res.json({
        message: "Cart quantity updated",
        item: updated.rows[0],
      });
    }

    // Insert new cart item
    const result = await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity, size, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cart.id, product_id, quantity, size ?? null, color ?? null]
    );

    res.json({
      message: "Added to cart",
      item: result.rows[0],
    });
  } catch (err) {
    console.error("Add to Cart Error:", err);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

/* ============================================================
   GET CUSTOMER CART
============================================================ */
export const getCart = async (req, res) => {
  try {
    const customer_id = req.user.id;

    const cartQ = await pool.query(
      "SELECT * FROM carts WHERE user_id = $1",
      [customer_id]
    );

    if (cartQ.rows.length === 0) {
      return res.json({ items: [], total: 0 });
    }

    const cart = cartQ.rows[0];

    const itemsQ = await pool.query(
      `
      SELECT
        ci.id AS cart_item_id,
        ci.quantity,
        p.id AS product_id,
        p.title,
        ROUND((COALESCE(ps.price, p.price) * (1 - COALESCE(NULLIF(ps.discount_percent, 0), p.discount_percent, 0) / 100.0))::numeric, 2) AS price,
        COALESCE(ps.price, p.price) AS original_price,
        COALESCE(NULLIF(ps.discount_percent, 0), p.discount_percent, 0) AS discount_percent,
        p.image_url,
        ci.size,
        ci.color,
        (ci.quantity * ROUND((COALESCE(ps.price, p.price) * (1 - COALESCE(NULLIF(ps.discount_percent, 0), p.discount_percent, 0) / 100.0))::numeric, 2)) AS subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_sizes ps ON ps.product_id = p.id AND ps.size = ci.size
      WHERE ci.cart_id = $1 AND p.status = 'active'
      `,
      [cart.id]
    );

    const total = itemsQ.rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    res.json({
      cart_id: cart.id,
      items: itemsQ.rows,
      total,
    });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

/* ============================================================
   UPDATE CART ITEM QUANTITY
============================================================ */
export const updateCartItem = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { item_id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        message: "Valid quantity is required",
      });
    }

    const itemQ = await pool.query(
      `
      SELECT ci.*, p.stock
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1 AND c.user_id = $2
      `,
      [item_id, customer_id]
    );

    if (itemQ.rows.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (quantity > itemQ.rows[0].stock) {
      return res.status(400).json({
        message: "Quantity exceeds available stock",
      });
    }

    const updated = await pool.query(
      `
      UPDATE cart_items
      SET quantity = $1
      WHERE id = $2
      RETURNING *
      `,
      [quantity, item_id]
    );

    res.json({
      message: "Cart item updated",
      item: updated.rows[0],
    });
  } catch (err) {
    console.error("Update Cart Item Error:", err);
    res.status(500).json({ message: "Failed to update cart item" });
  }
};

/* ============================================================
   REMOVE ITEM FROM CART
============================================================ */
export const removeCartItem = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { item_id } = req.params;

    const deleted = await pool.query(
      `
      DELETE FROM cart_items ci
      USING carts c
      WHERE ci.cart_id = c.id
        AND ci.id = $1
        AND c.user_id = $2
      RETURNING ci.*
      `,
      [item_id, customer_id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error("Remove Cart Item Error:", err);
    res.status(500).json({ message: "Failed to remove cart item" });
  }
};

/* ============================================================
   CLEAR ENTIRE CART
============================================================ */
export const clearCart = async (req, res) => {
  try {
    const customer_id = req.user.id;

    await pool.query(
      `
      DELETE FROM cart_items
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)
      `,
      [customer_id]
    );

    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear Cart Error:", err);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};
