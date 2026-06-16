import pool from "../config/db.js";

/* ============================================================
   ADD / UPSERT REVIEW (PURCHASE VERIFIED)
============================================================ */
export const addReview = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { product_id, rating, review_text } = req.body;

    if (!product_id || !rating) {
      return res.status(400).json({ message: "Product and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Verify purchase
    const purchaseCheck = await pool.query(
      `
      SELECT 1
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = $1
        AND o.user_id = $2
      LIMIT 1
      `,
      [product_id, customer_id]
    );

    if (purchaseCheck.rowCount === 0) {
      return res.status(403).json({ message: "You can only review products you purchased" });
    }

    const q = `
      INSERT INTO reviews (product_id, customer_id, rating, review_text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (product_id, customer_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(q, [
      product_id,
      customer_id,
      rating,
      review_text || null,
    ]);

    res.json({
      message: "Review saved",
      review: result.rows[0],
    });
  } catch (error) {
    console.error("Add Review Error:", error);
    res.status(500).json({ message: "Failed to add review" });
  }
};

/* ============================================================
   UPDATE REVIEW (OWNER ONLY)
============================================================ */
export const updateReview = async (req, res) => {
  try {
    const review_id = req.params.id;
    const customer_id = req.user.id;
    const { rating, review_text } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const result = await pool.query(
      `
      UPDATE reviews
      SET rating = COALESCE($1, rating),
          review_text = COALESCE($2, review_text),
          updated_at = NOW()
      WHERE id = $3 AND customer_id = $4
      RETURNING *
      `,
      [rating, review_text, review_id, customer_id]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed to update this review" });
    }

    res.json({ message: "Review updated", review: result.rows[0] });
  } catch (error) {
    console.error("Update Review Error:", error);
    res.status(500).json({ message: "Failed to update review" });
  }
};

/* ============================================================
   DELETE REVIEW (OWNER OR ADMIN)
============================================================ */
export const deleteReview = async (req, res) => {
  try {
    const review_id = req.params.id;
    const userId = req.user.id;

    // Check admin role (only non-blocked roles)
    const roleQ = await pool.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND (is_blocked IS NOT TRUE)",
      [userId]
    );

    const isAdmin = roleQ.rows.some(r => r.role === "admin");

    const q = isAdmin
      ? `DELETE FROM reviews WHERE id = $1 RETURNING *`
      : `DELETE FROM reviews WHERE id = $1 AND customer_id = $2 RETURNING *`;

    const params = isAdmin ? [review_id] : [review_id, userId];

    const result = await pool.query(q, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Review not found or not authorized" });
    }

    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};

/* ============================================================
   GET PRODUCT REVIEWS + STATS (PUBLIC)
============================================================ */
export const getProductReviews = async (req, res) => {
  try {
    const { product_id } = req.params;

    const reviews = await pool.query(
      `
      SELECT r.*, u.name AS customer_name
      FROM reviews r
      JOIN users u ON u.id = r.customer_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      `,
      [product_id]
    );

    const avg = await pool.query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS avg_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE product_id = $1
      `,
      [product_id]
    );

    res.json({
      reviews: reviews.rows,
      avg_rating: Number(avg.rows[0].avg_rating),
      total_reviews: Number(avg.rows[0].total_reviews),
    });
  } catch (error) {
    console.error("Get Product Reviews Error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
