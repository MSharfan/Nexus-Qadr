import express from "express";
import {
  getSellerEarnings,
  getDailyEarnings,
  getMonthlyEarnings,
} from "../controllers/sellerEarningsController.js";
import { verifyToken, sellerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", verifyToken, sellerOnly, getSellerEarnings);
router.get("/daily", verifyToken, sellerOnly, getDailyEarnings);
router.get("/monthly", verifyToken, sellerOnly, getMonthlyEarnings);

export default router;
