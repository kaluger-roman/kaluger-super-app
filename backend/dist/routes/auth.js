"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/register", controllers_1.register);
router.post("/login", controllers_1.login);
router.post("/verify-email", controllers_1.verifyEmail);
router.post("/resend-verification", controllers_1.resendVerification);
router.put("/profile", auth_1.authenticateToken, controllers_1.updateProfile);
router.get("/profile", auth_1.authenticateToken, controllers_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map