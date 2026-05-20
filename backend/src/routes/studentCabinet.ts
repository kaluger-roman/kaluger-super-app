import { Router } from "express";

import { studentCabinetGetLessons } from "../controllers";
import { authenticateStudent } from "../middleware/studentAuth";

const router: Router = Router();

router.get("/lessons", authenticateStudent, studentCabinetGetLessons);

export { router as studentCabinetRouter };
