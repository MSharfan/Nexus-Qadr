import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../utils/passwordPolicy.js";

// 🔹 helper – normalize email ONCE
const normalizeEmail = (email) => email.trim().toLowerCase();

/* =========================================================
   REGISTER
========================================================= */
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!validateStrongPassword(password)) {
    return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
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
      [userId, role]
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
      [userId, role]
    );

    await client.query("COMMIT");

    return res.json({ message: "Registration successful" });
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
