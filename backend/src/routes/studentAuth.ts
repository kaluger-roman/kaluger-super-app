import { Router } from "express";

import {
  studentLogin,
  studentLogout,
  studentMe,
  studentRegister,
  studentResendVerification,
  studentVerifyEmail,
} from "../controllers";
import { authenticateStudent } from "../middleware/studentAuth";
import {
  studentAuthRateLimiter,
  studentRegistrationRateLimiter,
} from "../middleware/rateLimit";

const router = Router();

router.post("/register", studentRegistrationRateLimiter, studentRegister);
router.post("/login", studentAuthRateLimiter, studentLogin);
router.post(
  "/verify-email",
  studentAuthRateLimiter,
  authenticateStudent,
  studentVerifyEmail
);
router.post(
  "/resend-verification",
  studentAuthRateLimiter,
  authenticateStudent,
  studentResendVerification
);
router.get("/me", authenticateStudent, studentMe);
router.post("/logout", authenticateStudent, studentLogout);

export default router;
