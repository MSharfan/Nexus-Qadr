import express from "express";
import { searchProducts, suggest } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", searchProducts);
router.get("/suggest", suggest);

export default router;

