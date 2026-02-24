import { Router } from "express";
import { getVapidKey, subscribe, unsubscribe, getSubscriptions } from "../controllers/push";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/vapid-key", getVapidKey);
router.post("/subscribe", authenticateToken, subscribe);
router.delete("/unsubscribe", authenticateToken, unsubscribe);
router.get("/subscriptions", authenticateToken, getSubscriptions);

export default router;
