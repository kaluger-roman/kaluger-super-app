import { Router } from "express";
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonCancellationInfo,
} from "../controllers/lessons";
import { authenticateToken } from "../middleware/auth";

export const lessonsRouter = Router();

// All routes require authentication
lessonsRouter.use(authenticateToken);

lessonsRouter.get("/", getLessons);
lessonsRouter.get("/:id", getLesson);
lessonsRouter.get("/:id/cancellation-info", getLessonCancellationInfo);
lessonsRouter.post("/", createLesson);
lessonsRouter.put("/:id", updateLesson);
lessonsRouter.delete("/:id", deleteLesson);
