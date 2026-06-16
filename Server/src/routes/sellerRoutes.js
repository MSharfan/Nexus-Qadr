import express from 'express';
import { verifyToken, sellerOnly } from '../middleware/authMiddleware.js';
import { getSellerDocuments, saveSellerDocuments } from '../controllers/sellerController.js';

const router = express.Router();

// Seller documents: get and save
router.get('/documents', verifyToken, sellerOnly, getSellerDocuments);
router.post('/documents', verifyToken, sellerOnly, saveSellerDocuments);

export default router;
