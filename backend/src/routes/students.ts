import { Router } from "express";
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  archiveStudent,
  unarchiveStudent,
  tutorIssueInvitation,
  tutorReadInvitationStatus,
  tutorRevokeInvitation,
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

router.post("/:id/invitations", tutorIssueInvitation);
router.get("/:id/invitations", tutorReadInvitationStatus);
router.delete("/:id/invitations", tutorRevokeInvitation);

export default router;
