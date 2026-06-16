import pool from "../config/db.js";

/* ============================================================
   ADMIN: GET ALL COUPONS
============================================================ */
export const getAllCoupons = async (req, res) => {
  try {
    const q = await pool.query(
      `
      SELECT *
      FROM coupons
      ORDER BY created_at DESC
      `
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Coupons Error:", err);
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
};

/* ============================================================
   ADMIN: CREATE COUPON
============================================================ */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      expires_at,
      usage_limit,
    } = req.body;

    if (
      !code ||
      !type ||
      !discount_type ||
      discount_value === undefined ||
      !expires_at
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["percentage", "flat"].includes(discount_type)) {
      return res.status(400).json({ message: "Invalid discount type" });
    }

    if (discount_value <= 0) {
      return res.status(400).json({ message: "Invalid discount value" });
    }
    if (!["order", "delivery"].includes(type)) {
      return res.status(400).json({ message: "Invalid coupon type" });
    }

    // Case-insensitive uniqueness check
    const exists = await pool.query(
      `SELECT id FROM coupons WHERE LOWER(code) = LOWER($1)`,
      [code]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const q = await pool.query(
      `
     INSERT INTO coupons (
      code,
      type,
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      expires_at,
      usage_limit
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *
     `,
      [
        code.trim().toUpperCase(),
        type,
        discount_type,
        discount_value,
        min_order_value || 0,
        max_discount || null,
        expires_at,
        usage_limit || null,
      ]
    );

    res.json({
      message: "Coupon created successfully",
      coupon: q.rows[0],
    });
  } catch (err) {
    console.error("Create Coupon Error:", err);
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

/* ============================================================
   ADMIN: UPDATE COUPON (SAFE WHITELIST)
============================================================ */
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "discount_type",
      "discount_value",
      "min_order_value",
      "max_discount",
      "expires_at",
      "usage_limit",
      "is_active",
    ];

    const fields = [];
    const values = [];
    let i = 1;

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === "discount_type") {
          if (!["percentage", "flat"].includes(req.body[key])) {
            return res.status(400).json({ message: "Invalid discount type" });
          }
        }

        if (
          (key === "discount_value" || key === "usage_limit") &&
          req.body[key] <= 0
        ) {
          return res.status(400).json({ message: "Invalid value" });
        }

        fields.push(`${key} = $${i++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    values.push(id);

    const q = await pool.query(
      `
      UPDATE coupons
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING *
      `,
      values
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({
      message: "Coupon updated successfully",
      coupon: q.rows[0],
    });
  } catch (err) {
    console.error("Update Coupon Error:", err);
    res.status(500).json({ message: "Failed to update coupon" });
  }
};

/* ============================================================
   ADMIN: DELETE COUPON
============================================================ */
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const q = await pool.query(
      `DELETE FROM coupons WHERE id = $1 RETURNING *`,
      [id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Delete Coupon Error:", err);
    res.status(500).json({ message: "Failed to delete coupon" });
  }
};

/* ============================================================
   CUSTOMER: VALIDATE COUPON (CHECKOUT)
============================================================ */
export const validateCoupon = async (req, res) => {
  try {
    const { code, order_total } = req.body;

    if (!code || order_total === undefined) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const q = await pool.query(
      `
      SELECT *
      FROM coupons
      WHERE LOWER(code) = LOWER($1)
        AND is_active = true
        AND expires_at > NOW()
      `,
      [code]
    );

    if (q.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired coupon" });
    }

    const coupon = q.rows[0];

    if (coupon.min_order_value > order_total) {
      return res.status(400).json({
        message: `Minimum order value is ${coupon.min_order_value}`,
      });
    }

    if (
      coupon.usage_limit !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    let discount = 0;

    if (coupon.discount_type === "percentage") {
      discount = (order_total * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    if (discount <= 0) {
      return res.status(400).json({ message: "Invalid discount" });
    }

    res.json({
      valid: true,
      discount,
      final_amount: Math.max(order_total - discount, 0),
    });
  } catch (err) {
    console.error("Validate Coupon Error:", err);
    res.status(500).json({ message: "Failed to validate coupon" });
  }
};
