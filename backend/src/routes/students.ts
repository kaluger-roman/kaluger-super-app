import { Router } from "express";
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  archiveStudent,
  unarchiveStudent,
} from "../controllers/students";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get("/", getStudents);
router.get("/:id", getStudent);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.put("/:id/archive", archiveStudent);
router.put("/:id/unarchive", unarchiveStudent);
router.delete("/:id", deleteStudent);

export default router;
