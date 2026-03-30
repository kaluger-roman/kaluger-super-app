import { Router } from "express";
import { getReminderSettings, updateReminderSettings } from "../controllers/reminderSettings";
import { authenticateToken } from "../middleware/auth";

export const reminderSettingsRouter = Router();

reminderSettingsRouter.use(authenticateToken);

reminderSettingsRouter.get("/", getReminderSettings);
reminderSettingsRouter.put("/", updateReminderSettings);
