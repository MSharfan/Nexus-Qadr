import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// ================== VERIFY TOKEN ==================
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ================== ROLE CHECK (DB) ==================
const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = await pool.query(
        "SELECT 1 FROM user_roles WHERE user_id = $1 AND role = $2 AND (is_blocked IS NOT TRUE)",
        [req.user.id, role]
      );

      if (result.rowCount === 0) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Role check error:", err);
      res.status(500).json({ message: "Authorization failed" });
    }
    console.log("JWT USER:", req.user);
  }; 
};

// ================== ROLE EXPORTS ==================
export const adminOnly = requireRole("admin");
export const sellerOnly = requireRole("seller");
export const customerOnly = requireRole("customer");
