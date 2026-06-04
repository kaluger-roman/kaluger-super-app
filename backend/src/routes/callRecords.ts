import { Router } from "express";

import { getStudentCallHistory, getTutorCallHistory } from "../controllers";
import { authenticateToken } from "../middleware/auth";
import { authenticateStudent } from "../middleware/studentAuth";

const callRecordsRouter: Router = Router();
callRecordsRouter.get("/history", authenticateToken, getTutorCallHistory);

const studentCallRecordsRouter: Router = Router();
studentCallRecordsRouter.get(
  "/calls/history",
  authenticateStudent,
  getStudentCallHistory
);

export { callRecordsRouter, studentCallRecordsRouter };
