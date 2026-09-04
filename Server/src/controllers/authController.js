import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../utils/passwordPolicy.js";

// 🔹 helper – normalize email ONCE
const normalizeEmail = (email) => email.trim().toLowerCase();

/* =========================================================
   ADMIN SETUP KEY VALIDATION
========================================================= */
export const validateAdminSetupKey = async (req, res) => {
  const { setupKey } = req.body || {};
  const expectedAdminSetupKey = process.env.ADMIN_SETUP_KEY;

  if (!expectedAdminSetupKey) {
    return res.status(500).json({
      message: "Admin setup key is not configured on the server"
    });
  }

  if (!setupKey || String(setupKey).trim() !== expectedAdminSetupKey) {
    return res.status(403).json({
      valid: false,
      message: "Invalid or missing admin setup key"
    });
  }

  return res.json({ valid: true, message: "Admin setup key valid" });
};

/* =========================================================
   REGISTER
========================================================= */
export const register = async (req, res) => {
  const { name, email, password, role, setupKey } = req.body;
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!name || !email || !password || !normalizedRole) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!validateStrongPassword(password)) {
    return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
  }

  if (normalizedRole === "admin") {
    const expectedAdminSetupKey = process.env.ADMIN_SETUP_KEY;

    if (!expectedAdminSetupKey) {
      return res.status(500).json({ message: "Admin setup key is not configured on the server" });
    }

    if (!setupKey || String(setupKey).trim() !== expectedAdminSetupKey) {
      return res.status(403).json({ message: "Invalid or missing admin setup key" });
    }
  }

  const emailNormalized = normalizeEmail(email);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Check if user exists (case-insensitive)
    const userRes = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [emailNormalized]
    );

    let userId;

    if (userRes.rows.length === 0) {
      // 2️⃣ Create user
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await client.query(
        `INSERT INTO users (name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, emailNormalized, hashedPassword]
      );

      userId = newUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // 3️⃣ Check role duplication
    const roleCheck = await client.query(
      "SELECT 1 FROM user_roles WHERE user_id = $1 AND role = $2",
      [userId, normalizedRole]
    );

    if (roleCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "User already exists with this role"
      });
    }

    // 4️⃣ Assign role
    await client.query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
      [userId, normalizedRole]
    );

    await client.query("COMMIT");

    // Generate email verification token (raw -> hashed stored)
    try {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await client.query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hashedToken, expiresAt]
      );

      const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000";
      const verifyUrl = `${frontendUrl}/auth/verify?token=${rawToken}`;

      // Send verification email (best-effort)
      await sendEmail({
        to: emailNormalized,
        subject: "Verify your email",
        html: `<p>Hi ${name},</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
        text: `Please verify your email: ${verifyUrl}`,
      });
    } catch (emailErr) {
      console.error("Verification email error:", emailErr);
      // Do not fail registration if email sending fails
    }

    return res.json({ message: "Registration successful; verification email sent" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  } finally {
    client.release();
  }
};

/* =========================================================
   LOGIN
========================================================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    const emailNormalized = normalizeEmail(email);

    // 1️⃣ Find user
    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [emailNormalized]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    // Require email verification
    if (user.email_verified !== true) {
      return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", message: "Email not verified" });
    }

    // 2️⃣ Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 3️⃣ Fetch roles (only non-blocked roles should be granted)
    const rolesRes = await pool.query(
      "SELECT role, is_blocked FROM user_roles WHERE user_id = $1",
      [user.id]
    );
    const roles = rolesRes.rows.filter(r => !r.is_blocked).map(r => r.role);
    if (roles.length === 0) {
      return res.status(403).json({ message: "No active roles assigned" });
    }

    // 4️⃣ Create JWT (NO role inside token – correct)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

/* =========================================================
   EMAIL VERIFICATION
========================================================= */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRes = await pool.query(
      `SELECT user_id FROM email_verifications WHERE token_hash = $1 AND used = false AND expires_at > NOW()`,
      [hashedToken]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const userId = tokenRes.rows[0].user_id;

    await pool.query("BEGIN");
    await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [userId]);
    await pool.query("UPDATE email_verifications SET used = true WHERE token_hash = $1", [hashedToken]);
    await pool.query("COMMIT");

    return res.json({ message: "Email verified" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Verify Email Error:", err);
    return res.status(500).json({ message: "Failed to verify email" });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const emailNormalized = String(email).trim().toLowerCase();

    const userRes = await pool.query("SELECT id, name, email_verified FROM users WHERE email = $1", [emailNormalized]);
    if (userRes.rowCount === 0) {
      // prevent enumeration
      return res.json({ message: "If an account exists, a verification email has been sent" });
    }

    const user = userRes.rows[0];
    if (user.email_verified === true) {
      return res.json({ message: "Email already verified" });
    }

    // Invalidate previous tokens
    await pool.query("UPDATE email_verifications SET used = true WHERE user_id = $1", [user.id]);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hashedToken, expiresAt]
    );

    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const verifyUrl = `${frontendUrl}/auth/verify?token=${rawToken}`;

    try {
      await sendEmail({
        to: emailNormalized,
        subject: "Verify your email",
        html: `<p>Hi ${user.name || "user"},</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
        text: `Please verify your email: ${verifyUrl}`,
      });
    } catch (sendErr) {
      console.error("Resend verification email error:", sendErr);
    }

    return res.json({ message: "If an account exists, a verification email has been sent" });
  } catch (err) {
    console.error("Resend Verification Error:", err);
    return res.status(500).json({ message: "Failed to resend verification" });
  }
};
