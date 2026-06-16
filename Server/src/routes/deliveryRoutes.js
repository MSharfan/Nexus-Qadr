import express from "express";
import {
  createTracking,
  updateTrackingStatus,
  addTrackingHistory,
  webhookUpdate,
  demoBlueDartWebhook,
  getTrackingByOrder,
  getTrackingDetails,
  listSellerTrackings
} from "../controllers/deliveryController.js";

import {
  verifyToken,
  adminOnly,
  sellerOnly
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Seller creates tracking for orders containing their products
 */
router.post("/create", verifyToken, sellerOnly, createTracking);

/**
 * Seller updates tracking status
 */
router.put("/update/:tracking_id", verifyToken, sellerOnly, updateTrackingStatus);

/**
 * Seller adds manual tracking history
 */
router.post("/history/:tracking_id", verifyToken, sellerOnly, addTrackingHistory);

/**
 * Courier webhook (protected by secret inside controller)
 */
router.post("/webhook", webhookUpdate);

// Demo webhook for Blue Dart (for local testing)
router.post("/webhook/demo/bluedart", demoBlueDartWebhook);

/**
 * Customer fetches tracking by order
 */
router.get("/order/:order_id", verifyToken, getTrackingByOrder);

/**
 * Authenticated user fetches tracking details
 */
router.get("/:tracking_id", verifyToken, getTrackingDetails);

/**
 * Seller lists all their order trackings
 */
router.get("/seller/list", verifyToken, sellerOnly, listSellerTrackings);

export default router;
