import { Router } from "express";
import { listTaxPeriods, replaceAllTaxPeriods } from "../controllers";

import { authenticateToken } from "../middleware/auth";

export const taxPeriodsRouter = Router();

taxPeriodsRouter.use(authenticateToken);

taxPeriodsRouter.get("/", listTaxPeriods);
taxPeriodsRouter.put("/", replaceAllTaxPeriods);
