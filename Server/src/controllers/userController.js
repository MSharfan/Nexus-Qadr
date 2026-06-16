import pool from "../config/db.js";

// GET current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const q = await pool.query(
      `SELECT id, name, email, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (q.rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(q.rows[0]);
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// PUT update profile (name, email)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, email } = req.body;
    if (!name && !email) return res.status(400).json({ message: "Nothing to update" });

    // Simple update – do not allow password changes here
    const fields = [];
    const vals = [];
    let idx = 1;
    if (typeof name === "string") {
      fields.push(`name = $${idx++}`);
      vals.push(name);
    }
    if (typeof email === "string") {
      fields.push(`email = $${idx++}`);
      vals.push(email.trim().toLowerCase());
    }

    vals.push(userId);

    const q = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, created_at`,
      vals
    );

    if (q.rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json({ user: q.rows[0] });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
