import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { quoteCartShipping } from "../controllers/shippingController.js";

const router = express.Router();

router.post("/quote", verifyToken, quoteCartShipping);

export default router;
