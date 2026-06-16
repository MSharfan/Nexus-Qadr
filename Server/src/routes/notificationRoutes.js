import express from "express";
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  adminGetUserNotifications,
} from "../controllers/notificationController.js";
import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get all notifications for logged-in user
 */
router.get("/", verifyToken, getNotifications);

/**
 * Create notification (ADMIN ONLY)
 */
router.post("/create", verifyToken, adminOnly, createNotification);

/**
 * Mark single notification as read
 */
router.put("/read/:id", verifyToken, markAsRead);

/**
 * Mark all notifications as read
 */
router.put("/read-all", verifyToken, markAllAsRead);

/**
 * ADMIN: View notifications + read status of a user
 */
router.get(
  "/admin/user/:user_id",
  verifyToken,
  adminOnly,
  adminGetUserNotifications
);

/**
 * Delete notification
 */
router.delete("/:id", verifyToken, deleteNotification);

export default router;
