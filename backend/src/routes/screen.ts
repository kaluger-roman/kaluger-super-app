import express, { Router } from "express";

import { uploadScreen, getLatestScreen, getScreenToken } from "../controllers/screen";
import { authenticateToken } from "../middleware/auth";
import { screenUploadRateLimiter } from "../middleware/rateLimit";

export const screenRouter = Router();

screenRouter.post(
  "/upload",
  screenUploadRateLimiter,
  express.raw({ type: ["image/*", "application/octet-stream"], limit: "5mb" }),
  uploadScreen
);
screenRouter.get("/latest", authenticateToken, getLatestScreen);
screenRouter.get("/token", authenticateToken, getScreenToken);
