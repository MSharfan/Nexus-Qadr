import express from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   USER ADDRESS ROUTES
============================================================ */

// Get all addresses for logged-in user
router.get("/", verifyToken, getAddresses);

// Add new address
router.post("/", verifyToken, addAddress);

// Update address (safe whitelist handled in controller)
router.put("/:id", verifyToken, updateAddress);

// Delete address
router.delete("/:id", verifyToken, deleteAddress);

// Set default address (ONLY way to change is_default)
router.put("/default/:id", verifyToken, setDefaultAddress);

export default router;
