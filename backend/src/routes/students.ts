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

export const studentsRouter = Router();

// All routes require authentication
studentsRouter.use(authenticateToken);

studentsRouter.get("/", getStudents);
studentsRouter.get("/:id", getStudent);
studentsRouter.post("/", createStudent);
studentsRouter.put("/:id", updateStudent);
studentsRouter.put("/:id/archive", archiveStudent);
studentsRouter.put("/:id/unarchive", unarchiveStudent);
studentsRouter.delete("/:id", deleteStudent);

studentsRouter.post("/:id/invitations", tutorIssueInvitation);
studentsRouter.get("/:id/invitations", tutorReadInvitationStatus);
studentsRouter.delete("/:id/invitations", tutorRevokeInvitation);
