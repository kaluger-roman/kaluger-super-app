import { Router } from "express";
import { getReminderSettings, updateReminderSettings } from "../controllers/reminderSettings";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", getReminderSettings);
router.put("/", updateReminderSettings);

export default router;
