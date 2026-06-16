import pool from "../config/db.js";

const ensureSavedLaterTable = async () => {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_for_later (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `);
};

export const addSavedLater = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    await ensureSavedLaterTable();

    const q = await pool.query(
      `
      INSERT INTO saved_for_later (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *
      `,
      [user_id, product_id]
    );

    res.status(q.rowCount === 0 ? 200 : 201).json({
      message: q.rowCount === 0 ? "Already saved for later" : "Saved for later",
      item: q.rows[0] || null,
    });
  } catch (err) {
    console.error("Add Saved Later Error:", err);
    res.status(500).json({ message: "Failed to save item for later" });
  }
};

export const getSavedLater = async (req, res) => {
  try {
    const user_id = req.user.id;
    await ensureSavedLaterTable();

    const q = await pool.query(
      `
      SELECT
        s.id AS saved_later_id,
        p.*
      FROM saved_for_later s
      JOIN products p ON p.id = s.product_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      `,
      [user_id]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Saved Later Error:", err);
    res.status(500).json({ message: "Failed to fetch saved items" });
  }
};

export const removeSavedLater = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.params;

    await ensureSavedLaterTable();

    const q = await pool.query(
      `
      DELETE FROM saved_for_later
      WHERE user_id = $1 AND product_id = $2
      RETURNING *
      `,
      [user_id, product_id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ message: "Item not found in saved for later" });
    }

    res.json({ message: "Removed from saved for later" });
  } catch (err) {
    console.error("Remove Saved Later Error:", err);
    res.status(500).json({ message: "Failed to remove saved item" });
  }
};
