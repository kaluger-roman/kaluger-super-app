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

const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/verify-email", authRateLimiter, verifyEmail);
authRouter.post("/resend-verification", authRateLimiter, resendVerification);
authRouter.put("/profile", authenticateToken, updateProfile);
authRouter.get("/profile", authenticateToken, getProfile);
authRouter.post("/change-password", authRateLimiter, authenticateToken, changePassword);
authRouter.post("/change-email", authRateLimiter, authenticateToken, changeEmail);
authRouter.post("/verify-email-change", authenticateToken, verifyEmailChange);
authRouter.post("/resend-email-change-code", authenticateToken, resendEmailChangeCode);
authRouter.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
authRouter.post("/reset-password/verify", passwordResetRateLimiter, verifyResetToken);
authRouter.post("/reset-password", passwordResetRateLimiter, resetPassword);

export { authRouter };
