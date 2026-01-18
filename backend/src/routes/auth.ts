import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.put("/profile", authenticateToken, updateProfile);
router.get("/profile", authenticateToken, getProfile);

export default router;
