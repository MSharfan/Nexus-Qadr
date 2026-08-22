import express from "express";
import { register, login, validateAdminSetupKey } from "../controllers/authController.js";

const router = express.Router();

router.post("/admin/validate-setup-key", validateAdminSetupKey);
router.post("/register", register);
router.post("/login", login);

export default router;