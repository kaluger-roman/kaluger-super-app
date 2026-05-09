import { Router } from "express";
import {
  listTaxPeriods,
  createTaxPeriod,
  updateTaxPeriod,
  deleteTaxPeriod,
} from "../controllers";

import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", listTaxPeriods);
router.post("/", createTaxPeriod);
router.patch("/:id", updateTaxPeriod);
router.delete("/:id", deleteTaxPeriod);

export default router;
