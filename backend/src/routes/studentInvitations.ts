import { Router } from "express";

import { studentInvitationValidate } from "../controllers";
import { studentInvitationValidationRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.get(
  "/validate/:token",
  studentInvitationValidationRateLimiter,
  studentInvitationValidate
);

export default router;
