import { Router } from "express";
import { getVapidKey, subscribe, unsubscribe, getSubscriptions } from "../controllers/push";
import { authenticateToken } from "../middleware/auth";

export const pushRouter = Router();

pushRouter.get("/vapid-key", getVapidKey);
pushRouter.post("/subscribe", authenticateToken, subscribe);
pushRouter.delete("/unsubscribe", authenticateToken, unsubscribe);
pushRouter.get("/subscriptions", authenticateToken, getSubscriptions);
