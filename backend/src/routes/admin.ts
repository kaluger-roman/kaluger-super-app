import { Router } from "express";
import { adminLogin, getOverview } from "../controllers/admin";
import { getSettings, updateSettings, createBackup } from "../controllers/backup";
import { authenticateAdmin } from "../middleware/adminAuth";
import { adminLoginRateLimiter } from "../middleware/rateLimit";

const router = Router();

// Public
router.post("/login", adminLoginRateLimiter, adminLogin);

// Protected
router.get("/overview", authenticateAdmin, getOverview);
router.get("/backup/settings", authenticateAdmin, getSettings);
router.put("/backup/settings", authenticateAdmin, updateSettings);
router.post("/backup/create", authenticateAdmin, createBackup);

export { router as adminRouter };
