import { Router } from "express";
import {
  getStatistics,
  getLessonsBySubject,
  getLessonsByType,
  getStudentStatistics,
} from "../controllers/statistics";
import { authenticateToken } from "../middleware/auth";

export const statisticsRouter = Router();

// All routes require authentication
statisticsRouter.use(authenticateToken);

// Основная статистика
statisticsRouter.get("/", getStatistics);

// Детальная статистика
statisticsRouter.get("/by-subject", getLessonsBySubject);
statisticsRouter.get("/by-type", getLessonsByType);
statisticsRouter.get("/by-student", getStudentStatistics);
