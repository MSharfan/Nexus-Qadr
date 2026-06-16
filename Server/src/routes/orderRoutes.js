// Server/src/routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
   getOrderById,
   cancelOrder,
} from "../controllers/orderController.js";
import {
  verifyToken,
  sellerOnly,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   CUSTOMER ROUTES
============================================================ */

// Place order (customer)
router.post("/", verifyToken, createOrder);

// Get my orders (customer)
router.get("/my", verifyToken, getMyOrders);

/* ============================================================
   SELLER ROUTES
============================================================ */

// Get seller orders (only their items)
router.get("/seller", verifyToken, sellerOnly, getSellerOrders);

/* ============================================================
   PARAMETERED ORDER ROUTES (keep after static routes)
============================================================ */

// Update order / payment status
// - Seller: can update order status (shipped, delivered)
// - Admin : can update anything
router.put("/:id/status", verifyToken, updateOrderStatus);

// Customer cancels order
router.put("/:id/cancel", verifyToken, cancelOrder);

// Get single order (customer/seller/admin)
router.get("/:id", verifyToken, getOrderById);

/* ============================================================
   ADMIN ROUTES (OPTIONAL / FUTURE)
============================================================ */

/* ============================================================
   ADMIN ROUTES (OPTIONAL / FUTURE)
============================================================ */

// Example (only if you need later):
// router.get("/all", verifyToken, adminOnly, getAllOrders);

export default router;
