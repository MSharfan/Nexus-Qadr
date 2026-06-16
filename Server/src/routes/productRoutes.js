// Server/src/routes/productRoutes.js
import express from "express";
import { verifyToken, sellerOnly } from "../middleware/authMiddleware.js";
import { uploadCloud } from "../config/cloudinaryConfig.js";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  getProductById,
  getAllProducts,
  updateProductStatus,
} from "../controllers/productController.js";

const router = express.Router();

/* ============================================================
   CLOUDINARY IMAGE UPLOAD
============================================================ */
router.post(
  "/upload-image",
  verifyToken,
  sellerOnly,
  (req, res, next) => {
    uploadCloud.single("image")(req, res, (err) => {
      if (err) {
        console.error("❌ Upload error:", err);
        return res.status(400).json({
          message: "Image upload failed",
          error: err.message || err,
        });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "No image file received",
      });
    }

    res.json({
      message: "Image uploaded successfully",
      image_url: req.file.path,
      public_id: req.file.filename,
    });
  }
);

/* ============================================================
   PRODUCT ROUTES
============================================================ */

// Seller
router.post("/add", verifyToken, sellerOnly, addProduct);
router.put("/:id", verifyToken, sellerOnly, updateProduct);
router.patch("/:id/status", verifyToken, sellerOnly, updateProductStatus);
router.delete("/:id", verifyToken, sellerOnly, deleteProduct);
router.get("/seller", verifyToken, sellerOnly, getSellerProducts);

// Public: single product (keep before the list route)
router.get("/:id", getProductById);

// Public
router.get("/", getAllProducts);

export default router;
