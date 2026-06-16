import express from "express";
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getAllCoupons,
} from "../controllers/couponController.js";

import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   ADMIN ROUTES (COUPON MANAGEMENT)
============================================================ */

// Create coupon
router.post("/", verifyToken, adminOnly, createCoupon);

// Get all coupons
router.get("/", verifyToken, adminOnly, getAllCoupons);

// Update coupon
router.put("/:id", verifyToken, adminOnly, updateCoupon);

// Delete coupon
router.delete("/:id", verifyToken, adminOnly, deleteCoupon);

/* ============================================================
   CUSTOMER ROUTES (COUPON USAGE)
============================================================ */

// Validate coupon before checkout
router.post("/validate", verifyToken, validateCoupon);

export default router;
