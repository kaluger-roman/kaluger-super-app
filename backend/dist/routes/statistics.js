"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statistics_1 = require("../controllers/statistics");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Основная статистика
router.get("/", statistics_1.getStatistics);
// Детальная статистика
router.get("/by-subject", statistics_1.getLessonsBySubject);
router.get("/by-type", statistics_1.getLessonsByType);
router.get("/by-student", statistics_1.getStudentStatistics);
exports.default = router;
//# sourceMappingURL=statistics.js.map