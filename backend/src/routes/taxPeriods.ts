import { Router } from "express";
import { listTaxPeriods, replaceAllTaxPeriods } from "../controllers";

import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listTaxPeriods);
router.put("/", replaceAllTaxPeriods);

export default router;
