import pool from "../config/db.js";

/* ============================================================
   CREATE NOTIFICATION (ADMIN ONLY)
============================================================ */
export const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type = "system" } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await pool.query(
      `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [user_id, title, message, type]
    );

    res.status(201).json({
      message: "Notification created",
      notification: result.rows[0],
    });
  } catch (err) {
    console.error("Create Notification Error:", err);
    res.status(500).json({ message: "Failed to create notification" });
  }
};

/* ============================================================
   GET USER NOTIFICATIONS
============================================================ */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/* ============================================================
   MARK SINGLE NOTIFICATION AS READ
============================================================ */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark Notification Error:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};

/* ============================================================
   MARK ALL AS READ
============================================================ */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark All Read Error:", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};
/* ============================================================
   ADMIN: GET USER NOTIFICATIONS (READ STATUS)
============================================================ */
export const adminGetUserNotifications = async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user_id]
    );

    res.json({
      user_id,
      notifications: result.rows,
    });
  } catch (err) {
    console.error("Admin Get User Notifications Error:", err);
    res.status(500).json({ message: "Failed to fetch user notifications" });
  }
};
/* ============================================================
   DELETE NOTIFICATION
============================================================ */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};
