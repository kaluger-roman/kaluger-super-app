import { Router } from "express";

import { getStudentCallHistory, getTutorCallHistory, getTutorLessonCalls } from "../controllers";
import { authenticateToken } from "../middleware/auth";
import { authenticateStudent } from "../middleware/studentAuth";

const callRecordsRouter: Router = Router();
callRecordsRouter.get("/history", authenticateToken, getTutorCallHistory);
callRecordsRouter.get("/lessons/:lessonId", authenticateToken, getTutorLessonCalls);

const studentCallRecordsRouter: Router = Router();
studentCallRecordsRouter.get("/calls/history", authenticateStudent, getStudentCallHistory);

export { callRecordsRouter, studentCallRecordsRouter };
