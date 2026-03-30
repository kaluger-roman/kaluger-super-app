import { Router } from "express";
import { getSettings, updateSettings, createBackup } from "../controllers/backup";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/create", createBackup);

export { router as backupRouter };
