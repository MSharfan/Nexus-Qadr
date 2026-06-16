import pool from "../config/db.js";

/* ============================================================
   GET ALL ADDRESSES (USER)
============================================================ */
export const getAddresses = async (req, res) => {
  try {
    const user_id = req.user.id;

    const q = await pool.query(
      `
      SELECT *
      FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
      `,
      [user_id]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Addresses Error:", err);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

/* ============================================================
   ADD ADDRESS
============================================================ */
export const addAddress = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      label,
      full_name,
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      country,
      type,
      proof_url,
    } = req.body;

    if (!full_name || !phone || !line1 || !city || !postal_code || !country) {
      return res.status(400).json({
        message: "Missing required address fields",
      });
    }

    // Check if user has any address
    const existing = await pool.query(
      `SELECT COUNT(*) FROM addresses WHERE user_id = $1`,
      [user_id]
    );

    const isDefault = Number(existing.rows[0].count) === 0;

    const q = await pool.query(
      `
      INSERT INTO addresses (
        user_id,
        label,
        full_name,
        phone,
        line1,
        line2,
        city,
        state,
        postal_code,
        country,
        type,
        proof_url,
        is_default
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
      `,
      [
        user_id,
        label || "Home",
        full_name,
        phone,
        line1,
        line2 || null,
        city,
        state || null,
        postal_code,
        country,
        type || "home",
        proof_url || null,
        isDefault,
      ]
    );

    res.json({
      message: "Address added successfully",
      address: q.rows[0],
    });
  } catch (err) {
    console.error("Add Address Error:", err);
    res.status(500).json({ message: "Failed to add address" });
  }
};

/* ============================================================
   UPDATE ADDRESS (SAFE WHITELIST)
============================================================ */
export const updateAddress = async (req, res) => {
  try {
    const user_id = req.user.id;
    const address_id = req.params.id;

    const allowedFields = [
      "label",
      "full_name",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "postal_code",
      "country",
      "type",
      "proof_url",
    ];

    const fields = [];
    const values = [];
    let i = 1;

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    values.push(address_id, user_id);

    const q = await pool.query(
      `
      UPDATE addresses
      SET ${fields.join(", ")}
      WHERE id = $${i++} AND user_id = $${i}
      RETURNING *
      `,
      values
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({
      message: "Address updated successfully",
      address: q.rows[0],
    });
  } catch (err) {
    console.error("Update Address Error:", err);
    res.status(500).json({ message: "Failed to update address" });
  }
};

/* ============================================================
   DELETE ADDRESS
============================================================ */
export const deleteAddress = async (req, res) => {
  try {
    const user_id = req.user.id;
    const address_id = req.params.id;

    const q = await pool.query(
      `
      DELETE FROM addresses
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [address_id, user_id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error("Delete Address Error:", err);
    res.status(500).json({ message: "Failed to delete address" });
  }
};

/* ============================================================
   SET DEFAULT ADDRESS (ONLY PLACE ALLOWED)
============================================================ */
export const setDefaultAddress = async (req, res) => {
  const client = await pool.connect();

  try {
    const user_id = req.user.id;
    const address_id = req.params.id;

    await client.query("BEGIN");

    await client.query(
      `
      UPDATE addresses
      SET is_default = false
      WHERE user_id = $1
      `,
      [user_id]
    );

    const q = await client.query(
      `
      UPDATE addresses
      SET is_default = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [address_id, user_id]
    );

    if (q.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Address not found" });
    }

    await client.query("COMMIT");

    res.json({
      message: "Default address updated",
      address: q.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Set Default Address Error:", err);
    res.status(500).json({ message: "Failed to set default address" });
  } finally {
    client.release();
  }
};
