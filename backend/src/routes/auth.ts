import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
} from "../controllers";

import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.put("/profile", authenticateToken, updateProfile);
router.get("/profile", authenticateToken, getProfile);

export default router;
