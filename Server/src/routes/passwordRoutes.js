import express from "express";
import {
  forgotPassword,
  resetPassword
} from "../controllers/passwordController.js";
import { forgotPasswordLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * Public – rate limited to prevent abuse */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

/**
 * Public – protected by token + expiry + single-use
 * (NO rate limit needed here)*/
router.post(
  "/reset-password",
  resetPassword
);

export default router;
