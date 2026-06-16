// Server/src/routes/cartRoutes.js
import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   CUSTOMER CART ROUTES
============================================================ */

// Get current user's cart
router.get("/", verifyToken, getCart);

// Add product to cart
router.post("/add", verifyToken, addToCart);

// Update cart item quantity
router.put("/item/:item_id", verifyToken, updateCartItem);

// Remove item from cart
router.delete("/item/:item_id", verifyToken, removeCartItem);

// Clear entire cart
router.delete("/clear", verifyToken, clearCart);

export default router;
