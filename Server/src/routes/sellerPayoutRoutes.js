import express from "express";
import {
  getPayoutSummary,
  requestPayout,
} from "../controllers/sellerPayoutController.js";
import { verifyToken, sellerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", verifyToken, sellerOnly, getPayoutSummary);
router.post("/request", verifyToken, sellerOnly, requestPayout);

export default router;
