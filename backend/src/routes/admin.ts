import { Router } from "express";
import { adminLogin, getOverview } from "../controllers/admin";
import { getAlerts, markAlertRead, markAllAlertsRead } from "../controllers/adminAlerts";
import { getAdminSettings, sendTestEmail, updateAdminSettings } from "../controllers/adminSettings";
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
router.get("/alerts", authenticateAdmin, getAlerts);
router.post("/alerts/read-all", authenticateAdmin, markAllAlertsRead);
router.post("/alerts/:id/read", authenticateAdmin, markAlertRead);
router.get("/settings", authenticateAdmin, getAdminSettings);
router.put("/settings", authenticateAdmin, updateAdminSettings);
router.post("/settings/test-email", authenticateAdmin, sendTestEmail);

export { router as adminRouter };
