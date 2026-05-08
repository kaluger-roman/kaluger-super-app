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

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.put("/profile", authenticateToken, updateProfile);
router.get("/profile", authenticateToken, getProfile);
router.post("/change-password", authenticateToken, changePassword);
router.post("/change-email", authenticateToken, changeEmail);
router.post("/verify-email-change", authenticateToken, verifyEmailChange);
router.post("/resend-email-change-code", authenticateToken, resendEmailChangeCode);

export default router;
