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
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from "../controllers";

import { authenticateToken } from "../middleware/auth";
import { authRateLimiter, passwordResetRateLimiter } from "../middleware/rateLimit";

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
router.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
router.post("/reset-password/verify", verifyResetToken);
router.post("/reset-password", resetPassword);

export default router;
