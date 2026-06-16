import express from "express";
import {
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   PUBLIC ROUTES
============================================================ */

// Get all categories (for customers, sellers, filters, etc.)
router.get("/", getAllCategories);

/* ============================================================
   ADMIN ROUTES
============================================================ */

// Add new category
router.post("/", verifyToken, adminOnly, addCategory);

// Update category
router.put("/:id", verifyToken, adminOnly, updateCategory);

// Delete category
router.delete("/:id", verifyToken, adminOnly, deleteCategory);

export default router;
