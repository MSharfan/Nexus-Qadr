import express from "express";
import {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews
} from "../controllers/reviewController.js";

import { verifyToken, customerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add or update review (purchase verified)
router.post("/add", verifyToken, customerOnly, addReview);

// Update review
router.put("/update/:id", verifyToken, customerOnly, updateReview);

// Delete review (owner or admin handled in controller)
router.delete("/delete/:id", verifyToken, deleteReview);

// Public: get reviews for product
router.get("/product/:product_id", getProductReviews);

export default router;
