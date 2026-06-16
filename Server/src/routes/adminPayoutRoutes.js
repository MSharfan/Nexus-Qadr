import express from "express";
import {
  getPayoutRequests,
  updatePayoutRequestStatus,
  processPayout,
} from "../controllers/adminPayoutController.js";

import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/requests", verifyToken, adminOnly, getPayoutRequests);
router.put("/request/:request_id", verifyToken, adminOnly, updatePayoutRequestStatus);
router.post("/pay/:request_id", verifyToken, adminOnly, processPayout);

export default router;
