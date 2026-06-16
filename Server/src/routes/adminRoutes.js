import express from "express";
import {
  getAllUsers,
  getAllSellers,
  getAllCustomers,
  blockUser,
  unblockUser,
  blockUserRole,
  unblockUserRole,
  getAllProducts,
  getAllOrders,
  setProductTrending,
  approveSeller
} from "../controllers/adminController.js";

import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// USERS
router.get("/users", verifyToken, adminOnly, getAllUsers);
router.get("/sellers", verifyToken, adminOnly, getAllSellers);
router.get("/customers", verifyToken, adminOnly, getAllCustomers);

// BLOCK / UNBLOCK
router.put("/block/:id", verifyToken, adminOnly, blockUser);
router.put("/unblock/:id", verifyToken, adminOnly, unblockUser);
// BLOCK / UNBLOCK SPECIFIC ROLE
router.put("/block-role/:id", verifyToken, adminOnly, blockUserRole);
router.put("/unblock-role/:id", verifyToken, adminOnly, unblockUserRole);

// SELLER APPROVAL
router.put("/approve-seller/:id", verifyToken, adminOnly, approveSeller);

// PRODUCTS
router.get("/products", verifyToken, adminOnly, getAllProducts);
router.put("/product/:id/trending", verifyToken, adminOnly, setProductTrending);

// ORDERS
router.get("/orders", verifyToken, adminOnly, getAllOrders);

export default router;
