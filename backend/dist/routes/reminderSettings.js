"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reminderSettings_1 = require("../controllers/reminderSettings");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get("/", reminderSettings_1.getReminderSettings);
router.put("/", reminderSettings_1.updateReminderSettings);
exports.default = router;
//# sourceMappingURL=reminderSettings.js.map