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

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get("/", getLessons);
router.get("/:id", getLesson);
router.get("/:id/cancellation-info", getLessonCancellationInfo);
router.post("/", createLesson);
router.put("/:id", updateLesson);
router.delete("/:id", deleteLesson);

export default router;
