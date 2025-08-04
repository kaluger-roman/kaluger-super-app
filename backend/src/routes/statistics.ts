import { Router } from "express";
import {
  getStatistics,
  getLessonsBySubject,
  getLessonsByType,
  getStudentStatistics,
} from "../controllers/statistics";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Основная статистика
router.get("/", getStatistics);

// Детальная статистика
router.get("/by-subject", getLessonsBySubject);
router.get("/by-type", getLessonsByType);
router.get("/by-student", getStudentStatistics);

export default router;
