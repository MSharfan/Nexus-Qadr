import pool from "../config/db.js";

/* ============================================================
   ADD TO WISHLIST
============================================================ */
export const addToWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const q = `
      INSERT INTO wishlist (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(q, [user_id, product_id]);

    if (result.rowCount === 0) {
      return res.json({ message: "Already in wishlist" });
    }

    res.status(201).json({
      message: "Added to wishlist",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Add Wishlist Error:", error);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
};

/* ============================================================
   REMOVE FROM WISHLIST
============================================================ */
export const removeFromWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM wishlist
      WHERE user_id = $1 AND product_id = $2
      RETURNING *
      `,
      [user_id, product_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
};

/* ============================================================
   GET USER WISHLIST
============================================================ */
export const getWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;

    const items = await pool.query(
      `
      SELECT
        w.id AS wishlist_id,
        p.*
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
      `,
      [user_id]
    );

    res.json(items.rows);
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

/* ============================================================
   CHECK IF PRODUCT IS IN WISHLIST
============================================================ */
export const isInWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.params;

    const q = await pool.query(
      `
      SELECT 1
      FROM wishlist
      WHERE user_id = $1 AND product_id = $2
      `,
      [user_id, product_id]
    );

    res.json({ inWishlist: q.rowCount > 0 });
  } catch (error) {
    console.error("Check Wishlist Error:", error);
    res.status(500).json({ message: "Failed to check wishlist" });
  }
};
