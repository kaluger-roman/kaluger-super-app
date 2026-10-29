import { Router } from "express";

import { studentPushSubscribe, studentPushUnsubscribe } from "../controllers";
import { authenticateStudent } from "../middleware/studentAuth";

const router: Router = Router();

router.post("/subscribe", authenticateStudent, studentPushSubscribe);
router.delete("/unsubscribe", authenticateStudent, studentPushUnsubscribe);

export { router as studentPushRouter };
