import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../utils/passwordPolicy.js";

/* ============================================================
   FORGOT PASSWORD
============================================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userRes = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );

    // Prevent email enumeration
    if (userRes.rowCount === 0) {
      return res.json({
        message: "If email exists, reset link has been sent",
      });
    }

    const user = userRes.rows[0];

    // Invalidate previous tokens
    await pool.query(
      "UPDATE password_resets SET used = true WHERE user_id = $1",
      [user.id]
    );

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      `,
      [user.id, hashedToken, expiresAt]
    );

    // TODO: Send email with reset link
    // Example:
    // https://yourapp.com/reset-password?token=${rawToken}

    res.json({
      message: "If email exists, reset link has been sent",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to process request" });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.body;
    const newPassword = req.body.newPassword ?? req.body.password;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (!validateStrongPassword(newPassword)) {
      return res.status(400).json({
        message: PASSWORD_REQUIREMENTS_MESSAGE,
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenRes = await pool.query(
      `
      SELECT user_id
      FROM password_resets
      WHERE token = $1
        AND used = false
        AND expires_at > NOW()
      `,
      [hashedToken]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const userId = tokenRes.rows[0].user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query("BEGIN");

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    await pool.query(
      "UPDATE password_resets SET used = true WHERE user_id = $1",
      [userId]
    );

    await pool.query("COMMIT");

    res.json({ message: "Password reset successful" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
