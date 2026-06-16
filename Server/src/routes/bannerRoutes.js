import express from 'express';
import { getBanner, updateBanner } from '../controllers/bannerController.js';
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public GET current banner
router.get('/', getBanner);

// Admin update (requires auth + admin role)
router.put('/', verifyToken, adminOnly, updateBanner);

export default router;
