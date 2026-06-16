// Server/src/routes/wishlistRoutes.js
import express from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  isInWishlist,
} from "../controllers/wishlistController.js";

import { verifyToken, customerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add product to wishlist
router.post("/add", verifyToken, customerOnly, addToWishlist);

// Remove product from wishlist
router.delete("/remove/:product_id", verifyToken, customerOnly, removeFromWishlist);

// Get all wishlist items for customer
router.get("/", verifyToken, customerOnly, getWishlist);

// Check if product is in wishlist
router.get("/check/:product_id", verifyToken, customerOnly, isInWishlist);

export default router;
