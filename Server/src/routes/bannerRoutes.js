import express from 'express';
import { getBanner, updateBanner } from '../controllers/bannerController.js';
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js';
import { uploadCloud } from '../config/cloudinaryConfig.js';

const router = express.Router();

// Public GET current banner
router.get('/', getBanner);

/* ============================================================
	 CLOUDINARY UPLOAD (Admin only)
	 POST /banner/upload-image
	 Accepts multipart form-data with `image` field and returns { image_url, public_id }
============================================================ */
router.post(
	'/upload-image',
	verifyToken,
	adminOnly,
	(req, res, next) => {
		uploadCloud.single('image')(req, res, (err) => {
			if (err) {
				console.error('❌ Upload error:', err);
				return res.status(400).json({ message: 'Image upload failed', error: err.message || err });
			}
			next();
		});
	},
	(req, res) => {
		if (!req.file) {
			return res.status(400).json({ message: 'No image file received' });
		}

		res.json({
			message: 'Image uploaded successfully',
			image_url: req.file.path,
			public_id: req.file.filename,
		});
	}
);

// Admin update (requires auth + admin role)
router.put('/', verifyToken, adminOnly, updateBanner);

export default router;
