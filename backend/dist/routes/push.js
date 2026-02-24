"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const push_1 = require("../controllers/push");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/vapid-key", push_1.getVapidKey);
router.post("/subscribe", auth_1.authenticateToken, push_1.subscribe);
router.delete("/unsubscribe", auth_1.authenticateToken, push_1.unsubscribe);
router.get("/subscriptions", auth_1.authenticateToken, push_1.getSubscriptions);
exports.default = router;
//# sourceMappingURL=push.js.map