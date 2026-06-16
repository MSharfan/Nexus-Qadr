import express from "express";
import {
  getAdminOverview,
  getSellerEarnings,
  getTopProducts,
  getCategorySales,
} from "../controllers/dashboardController.js";

import {
  verifyToken,
  adminOnly,
  sellerOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   ADMIN DASHBOARD ROUTES
============================================================ */

// Admin overview (users, revenue, orders)
router.get("/admin/overview", verifyToken, adminOnly, getAdminOverview);

// Admin: top products (paid orders only)
router.get("/admin/top-products", verifyToken, adminOnly, getTopProducts);

// Admin: category sales (paid orders only)
router.get("/admin/category-sales", verifyToken, adminOnly, getCategorySales);

// Admin: view any seller earnings
router.get(
  "/admin/seller/:id/earnings",
  verifyToken,
  adminOnly,
  getSellerEarnings
);

/* ============================================================
   SELLER DASHBOARD ROUTES
============================================================ */

// Seller: view own earnings
router.get(
  "/seller/earnings",
  verifyToken,
  sellerOnly,
  getSellerEarnings
);

export default router;
