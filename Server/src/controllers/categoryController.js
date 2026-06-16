import pool from "../config/db.js";

/* ============================================================
   GET ALL CATEGORIES (PUBLIC)
============================================================ */
export const getAllCategories = async (req, res) => {
  try {
    const q = await pool.query(
      `
      SELECT id, name, created_at
      FROM categories
      ORDER BY name ASC
      `
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Categories Error:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

/* ============================================================
   ADD CATEGORY (ADMIN ONLY)
============================================================ */
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Case-insensitive duplicate check
    const exists = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE LOWER(name) = LOWER($1)
      `,
      [name]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const q = await pool.query(
      `
      INSERT INTO categories (name)
      VALUES ($1)
      RETURNING *
      `,
      [name.trim()]
    );

    res.json({
      message: "Category added successfully",
      category: q.rows[0],
    });
  } catch (err) {
    console.error("Add Category Error:", err);
    res.status(500).json({ message: "Failed to add category" });
  }
};

/* ============================================================
   UPDATE CATEGORY (ADMIN ONLY)
============================================================ */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Prevent rename collision
    const exists = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE LOWER(name) = LOWER($1)
        AND id <> $2
      `,
      [name, id]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const q = await pool.query(
      `
      UPDATE categories
      SET name = $1
      WHERE id = $2
      RETURNING *
      `,
      [name.trim(), id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: "Category updated successfully",
      category: q.rows[0],
    });
  } catch (err) {
    console.error("Update Category Error:", err);
    res.status(500).json({ message: "Failed to update category" });
  }
};

/* ============================================================
   DELETE CATEGORY (ADMIN ONLY)
============================================================ */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting category in use
    const used = await pool.query(
      `
      SELECT 1
      FROM products
      WHERE category_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (used.rows.length > 0) {
      return res.status(400).json({
        message: "Category is in use and cannot be deleted",
      });
    }

    const q = await pool.query(
      `
      DELETE FROM categories
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Delete Category Error:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
