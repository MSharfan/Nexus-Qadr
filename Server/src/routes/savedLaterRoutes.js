import express from "express";
import { verifyToken, customerOnly } from "../middleware/authMiddleware.js";
import {
  addSavedLater,
  getSavedLater,
  removeSavedLater,
} from "../controllers/savedLaterController.js";

const router = express.Router();

router.get("/", verifyToken, customerOnly, getSavedLater);
router.post("/add", verifyToken, customerOnly, addSavedLater);
router.delete("/remove/:product_id", verifyToken, customerOnly, removeSavedLater);

export default router;
