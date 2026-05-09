import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
  changePassword,
  changeEmail,
  verifyEmailChange,
  resendEmailChangeCode,
} from "../controllers";

import { authenticateToken } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", authRateLimiter, resendVerification);
router.put("/profile", authenticateToken, updateProfile);
router.get("/profile", authenticateToken, getProfile);
router.post("/change-password", authenticateToken, changePassword);
router.post("/change-email", authenticateToken, changeEmail);
router.post("/verify-email-change", authenticateToken, verifyEmailChange);
router.post("/resend-email-change-code", authenticateToken, resendEmailChangeCode);

export default router;
