"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lessons_1 = require("../controllers/lessons");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
router.get("/", lessons_1.getLessons);
router.get("/upcoming", lessons_1.getUpcomingLessons);
router.get("/:id", lessons_1.getLesson);
router.post("/", lessons_1.createLesson);
router.put("/:id", lessons_1.updateLesson);
router.delete("/:id", lessons_1.deleteLesson);
exports.default = router;
//# sourceMappingURL=lessons.js.map