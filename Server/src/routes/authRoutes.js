import express from "express";
import { register, login, validateAdminSetupKey, verifyEmail, resendVerification } from "../controllers/authController.js";
import { forgotPasswordLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/admin/validate-setup-key", validateAdminSetupKey);
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", forgotPasswordLimiter, resendVerification);

export default router;