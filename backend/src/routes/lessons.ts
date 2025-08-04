import { Router } from "express";
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getUpcomingLessons,
} from "../controllers/lessons";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get("/", getLessons);
router.get("/upcoming", getUpcomingLessons);
router.get("/:id", getLesson);
router.post("/", createLesson);
router.put("/:id", updateLesson);
router.delete("/:id", deleteLesson);

export default router;
