import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

// GET /user -> profile
router.get("/", verifyToken, getProfile);

// PUT /user -> update profile
router.put("/", verifyToken, updateProfile);

export default router;
